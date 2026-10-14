import * as net from 'net';


const port = Number(process.argv[2] || 8080);

function handleConnection(socket: net.Socket) {
    console.log('New connection established' , socket.remoteAddress,socket.remotePort);


    socket.on('data',(data:Buffer) =>{
        console.log('Data received from client:', data);
        socket.write(data);

        if (data.includes('q')){
            console.log('connection will be closed');
            socket.end();
        }

        


    })

    socket.on('end',() =>{
        // FIN received from client, the connection is closed
        console.log('Server closed');
    })

    socket.on('error',(err:Error) =>{
        console.error('Socket error:', err);
    })
}

type TCPConn = {
    socket: net.Socket;

    err : null | Error;

    ended : boolean;

    // callbacks used by the promise for each read
    reader : null | {
        resolve : (value: Buffer) => void;
        reject : (reason: Error) => void;
    }
}

function soInit(socket: net.Socket):TCPConn{
    let conn : TCPConn = {
        socket:socket,
        err:null,
        ended:false,
        reader:null
    }

    socket.on('data',(data:Buffer) =>{

        console.assert(conn.reader == null);
        conn.socket.pause();
        conn.reader!.resolve(data);
        conn.reader = null;
    });

    socket.on('end',() =>{

        conn.ended = true;
        if(conn.reader != null){
            conn.reader.resolve(Buffer.from(""));
            conn.reader = null;
        }    

    }); 

    socket.on('error',(err:Error) =>{
        conn.err = err;
        if(conn.reader != null){
            conn.reader.reject(err);
            conn.reader = null;
        }    
    });

    return conn;
}


function soRead(conn : TCPConn):Promise<Buffer>{

    console.assert(conn.reader == null);

    return new Promise((resolve,reject) => {

        if(conn.err != null){
            reject(conn.err);
            return;
        }

        if(conn.ended){
            resolve(Buffer.from(""));
            return;
        }

        conn.reader = {
            resolve:resolve,
            reject:reject,
        }
        conn.socket.resume();
    });
};
function soWrite(conn : TCPConn,data : Buffer):Promise<void>{

    console.assert(data.length > 0 );

    return new Promise((resolve,reject) => {

        if(conn.err != null){
            reject(conn.err);
            return;
        }

        conn.socket.write(data,(err) =>{

            if(err){
                reject(err);
            } else {
                resolve();
            }
        });


});

let server = net.createServer({allowHalfOpen: false , pauseOnConnect:true})
server.on('error', (err :Error) => {
    throw err;
});
server.on('connection', handleConnection);




server.listen({host: 'localhost', port: port});