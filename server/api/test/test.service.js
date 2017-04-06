import cmd from 'node-cmd';
import Test from './test.model';

/**
 * Parse the bandwidth from the results
 * @param results - the results from the performance test
 */
function parseBandwidth(results) {
    //parse bandwidth from results
    let bandwidth = results.match(/.*Bytes   (\d{0,9} .bits\/sec).*/);

    if(!Array.isArray(bandwidth)) {
        return false;
    }

    return bandwidth[1];
}

/**
 * save results data from performance test
 * @param forwardBandwidth - bandwidth from client to server
 * @param reverseBandwidth - bandwidth from server to client
 * @param clientIp - ip address for client
 * @param serverIp - ip address for server
 */
function saveResults(forwardBandwidth, reverseBandwidth, clientIp, serverIp){
    Test.create({
        server_ip: serverIp,
        client_ip: clientIp,
        forward_bandwidth: forwardBandwidth,
        reverse_bandwidth: reverseBandwidth,
        success: true,
        timestamp: getDateTime(),
        message: 'Test ran successfully'
    });
}


/**
 * Get the the current timestamp
 */
function getDateTime(){
    var newDate = new Date();
    return newDate.toDateString() + " " + newDate.toLocaleTimeString();

}

/**
 * save a performance test that failed to execute
 * @param clientIp - the client ip address
 * @param serverIp - the server ip address
 */
function saveFailure(clientIp, serverIp, message) {
    Test.create({
        server_ip: serverIp,
        client_ip: clientIp,
        success: false,
        timestamp: getDateTime(),
        message: message
    });
    console.log(message);
}

/**
 * perform performance test
 * @param serverIp - the server ip address
 * @param clientIp - the server ip address
 */
export default function runTest(clientIp, serverIp) {
    //run the forward (client to server) performance test command
    let forwardTestCommand = 'iperf3 -c ' + serverIp + ' -B ' + clientIp + ' -f m -t 5 -i 30 -N -S 0x08 -w 223k';
    console.log('running forward performance test: ' + forwardTestCommand);
    cmd.get(
        forwardTestCommand,
        function(forwardTestResults) {
            if(!forwardTestResults) {
                saveFailure(clientIp, serverIp);
            }

            let forwardBandwidth = parseBandwidth(forwardTestResults);
            if(!forwardBandwidth) {
                saveFailure(clientIp, serverIp, 'Test did not run. Please verify the IP addresses are accessible from the web server.');
                return;
            }

            let reverseTestCommand = forwardTestCommand + " -R";
            console.log('running reverse performance test: ' + reverseTestCommand);
            cmd.get(
                reverseTestCommand,
                function(reverseTestResults) {
                    let reverseBandwidth = parseBandwidth(reverseTestResults);
                    if(!reverseBandwidth) {
                        saveFailure(clientIp, serverIp, 'Test did not return results correctly. Please try again.');
                    }
                    saveResults(forwardBandwidth, reverseBandwidth, clientIp, serverIp);
                    console.log('test ran successfully');
                }
            )
        }
    );
}