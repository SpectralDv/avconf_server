const http = require("http")
const Socket = require("websocket").server
const server = http.createServer(()=>{})

//npm install pg
//sudo apt install postgresql-client
//sudo su - postgres -c "createuser adminpsql -P --superuser"
//sudo su - postgres -c "createdb av"
//grant all privileges on database av to adminpsql;
//sudo adduser adminpsql
//sudo -i -u adminpsql 
//psql av
//sudo -i -u postgres
//psql 
//grant all privileges on database testDb to adminpsql;
//\q - выходит
//\l - выводит базы данных
//\dt - выводит таблицы 
//\du - выводит всех пользователей      
//\dt tablename - выводит таблицу
//\connect av - переходит из текущей базы в другую
//select * from users; - выводит таблицу users
//psql -U<USERNAME> -h<HOSTNAME> -d<DB_NAME>
//psql -U<adminpsql> -h<127.0.0.1> -d<av>
//psql \!chcp 1251 //кодировка для латиницы

const pg = require('pg');
const config = {
    host: '127.0.0.1',
    user: 'adminpsql1',
    password: '12345678',
    database: 'av',
    port: 5432,
    //idleTimeoutMillis: 0,
    //ssl: true
};
const client = new pg.Client(config);


function QuerySearchUser(data,connection)
{
    const query1 = `
        select * from users where name like '`+data.name+`';
    `;
    const query2 = `
        DELETE FROM users WHERE name = '`+data.name+`';
    `;
    client
    .query(query1)
    .then(res => {
            const rows = res.rows;
            console.log('searchDataBase: '+rows.length);
            if(data.type=="registration"){MakeRegistration(data,connection,rows.length);}

            // rows.map(row => {
            //     console.log(`Read: ${JSON.stringify(row)}`);
            // });
            //process.exit();
        })
    .catch(err => {
            console.log('searchDataBase error: '+err);
            //process.exit();
        });
}

function QueryCreateUser(nameuser,passworduser) 
{
    //console.log("nameuser, passworduser ", nameuser, passworduser)
    const query1 = ` 
        INSERT INTO users (name, password) VALUES (`+nameuser+`, `+passworduser+`);
    `;
    const query2 = `
        DROP TABLE IF EXISTS users;
    `;
    const query3 = `
        CREATE TABLE users (id serial PRIMARY KEY, name VARCHAR(50), password VARCHAR(50));
    `;
    client
        .query(query1)
        .then(() => {
            console.log('Table created successfully!');
            //client.end(console.log('Closed client connection'));
        })
        .catch(err => console.log(err))
        .then(() => {
            console.log('Finished execution, exiting now'); 
            //process.exit();
        });
}

function QueryAutorithation(data,connection)
{
    //console.log("nameuser, passworduser ", data.name, data.password)
    const queryName = ` 
        select * from users where name like '`+data.name+`' and password like '`+data.password+`';
    `;
    const queryPassword = ` 
        select * from users where password like `+data.password+`;
    `;
    client
        .query(queryName)
        .then(res => {
            console.log('res: ' + res.rows.length);
            if(res.rows.length>0){MakeAutorization(data,connection,1);}
            if(res.rows.length==0){MakeAutorization(data,connection,0);}
            console.log('Table select successfully!');
            //client.end(console.log('Closed client connection'));
        })
        .catch(err => console.log(err))
        .then(() => {
            console.log('Finished execution, exiting now'); 
            //process.exit(); 
        });
}

 
function MakeRegistration(data,connection,state_reg)
{
    if(state_reg>0)
    {
        connection.send(JSON.stringify({
            type:'registration_exists'
        }))
        console.log("registration_exists ")
    }
    if(state_reg==0)
    {
        QueryCreateUser(data.name,data.password);
        connection.send(JSON.stringify({ 
            type:'registration_success'
        }))
        console.log("registration_success ")
    }  
    console.log("MakeRegistration end ")
}

function MakeAutorization(data,connection,state_auth)
{
    if(state_auth==1)
    {
        //ищет пользователей в сети
        const user = findUserAuth(data.name)
        if(user != null){
            connection.send(JSON.stringify({
                type:'autorization_online'
            }))
            console.log("usersAuth: " + usersAuth.length)
            console.log("users: " + users.length)
            return
        }
        const newUser = {
            name: data.name, conn: connection
        }
        usersAuth.push(newUser)
        connection.send(JSON.stringify({ 
                type:'autorization_success',
                name:data.name
            }))
        console.log("usersAuth: " + usersAuth.length)
        console.log("users: " + users.length)
    }
    if(state_auth==0)
    {
        connection.send(JSON.stringify({ 
            type:'autorization_exists',
            name:data.name
        }))
        console.log("autorization_exists ")
    }
}

///////////////////////////////////////////////////////////
server.listen(3000,()=>{
    console.log("server started on port 3000")
})
 
const webSocket = new Socket({httpServer:server}) 
//список пользователей в сети
const usersAuth = []
const users = []


webSocket.on('request',(req)=>{ 
    const connection = req.accept()
    //console.log(connection)

    connection.on('message',(message)=>{
        const data = JSON.parse(message.utf8Data)
        console.log(data);
        const user = findUser(data.name)

        switch(data.type){
            //0.подключение
            case "connection":
                console.log("connection")
            break

            //0.регистрация
            case "registration":
                client.connect(err => {
                    //if (err) throw err;
                    //else {
                        QuerySearchUser(data,connection);
                    //}
                });
                console.log("registration end")
            break 

            //0.авторизация
            case "autorization":
                client.connect(err => {
                    //if (err) throw err;
                    //else {
                        QueryAutorithation(data,connection);
                    //}
                });
                console.log("autorization end")
            break 

            //0.Запись логина в базу пользователей
            case "store_user":
                console.log("store_user")
                const user = findUser(data.name)
                if(user != null){
                    connection.send(JSON.stringify({
                        type:'autorization_exists'
                    }))
                    return
                }
                const newUser = {
                    name:data.name, conn: connection
                }
                users.push(newUser)
                if(user != null){
                    connection.send(JSON.stringify({
                        type:'autorization_online'
                    }))
                    return
                }
            break

            //1.Возвращает звонящему статус собеседника
            case "start_call":
                let userToCall = findUser(data.target) 

                if(userToCall){
                    connection.send(JSON.stringify({ 
                        type:"call_response", data:"user is ready for call" 
                    }))
                } else{
                    connection.send(JSON.stringify({
                        type:"call_response", data:"user is not online"
                    }))
                }
            break
                
            //2.отправляет оффер собеседнику
            case "create_offer":
                let userToReceiveOffer = findUser(data.target)

                if (userToReceiveOffer){
                    userToReceiveOffer.conn.send(JSON.stringify({
                        type:"offer_received",
                        name:data.name,
                        data:data.data.sdp
                    }))
                }
            break
            
            //3.обмен кандидатами
            case "ice_candidate":
                let userToReceiveIceCandidate = findUser(data.target)
                if(userToReceiveIceCandidate){
                    userToReceiveIceCandidate.conn.send(JSON.stringify({
                        type:"ice_candidate",
                        name:data.name,
                        data:{
                            sdpMLineIndex:data.data.sdpMLineIndex,
                            sdpMid:data.data.sdpMid,
                            sdpCandidate: data.data.sdpCandidate
                        }
                    }))
                }
            break
            
            //4.собеседник отправляет sdp ответ
            case "create_answer":
                let userToReceiveAnswer = findUser(data.target)
                if(userToReceiveAnswer){
                    userToReceiveAnswer.conn.send(JSON.stringify({
                        type:"answer_received",
                        name: data.name,
                        data:data.data.sdp
                    }))
                }
            break
        }
    })
    
    connection.on('close', () =>{
        //отключает соединение авторизации
        usersAuth.forEach( userAuth => {
        if(userAuth.conn === connection)
            {
                usersAuth.splice(usersAuth.indexOf(userAuth),1)
                console.log("disconnect Auth: " + userAuth.name);
            }
        })
    })

    connection.on('close', () =>{
        //отключает соединение звонка
        users.forEach( user => {
            if(user.conn === connection)
            {
                users.splice(users.indexOf(user),1)
                console.log("disconnect call: " + user.name); 
            }
        })
    })
})

const findUser = username =>{
    for(let i=0; i<users.length;i++){
        if(users[i].name === username)
        return users[i]
    }
}

const findUserAuth = username =>{
    for(let i=0; i<usersAuth.length;i++){
        if(usersAuth[i].name === username)
        return usersAuth[i]
    }
}
