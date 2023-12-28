// import jwt from 'jsonwebtoken';
const jwt = require("jsonwebtoken");
const express = require("express");
const app = express();
const mysql = require("mysql");
const PORT = process.env.port || 8000;

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

const memberlogdb = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  password: "jy122385@",
  database: "log",
});

const gamelogdb = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  password: "jy122385@",
  database: "game_data",
});

const secretKey = "yourSecretKey";

app.post("/logRead", async (req, res) => {
    try {
        const search = req.body.search;
        const type = req.body.type;
        let filterCondition = [`%${search}%`];
        // 데이터베이스 연결
        let queryString = "SELECT id, DATE_FORMAT(time, '%Y.%m.%d %H:%i') as time1, memberID, type, action from log_table WHERE action LIKE ? ORDER BY time desc";
        if (type != "all") {
          queryString = "SELECT id, DATE_FORMAT(time, '%Y.%m.%d %H:%i') as time1, memberID, type, action from log_table WHERE type = ? and action LIKE ? ORDER BY time desc";
          filterCondition= [type, `%${search}%`];
        }
        // 'GET' 요청일 때 추가 작업 수행
        const logs = await new Promise((resolve, reject) => {
          // 'log_table' 테이블의 데이터 조회
          memberlogdb.query(queryString, filterCondition, (error, results) => {
            if (error) {
              reject(error);
              return;
            }
            resolve(results);
          });
        });
      
        // 'GET' 요청에 대한 응답
        res.json({ logs: logs });
      
        // 연결 종료
      } catch (error) {
        console.error(error);
        // 에러를 적절히 처리하세요 (응답 보내거나 재전파)
        res.status(500).send('Internal Server Error', error);
      }
});

app.post("/gamelogRead", async (req, res) => {
  try {
      const search = req.body.search;
      const type = req.body.type;
      // 데이터베이스 연결
      let queryString = "SELECT id, DATE_FORMAT(time, '%Y.%m.%d %H:%i') as time1, userID, score, playtime from gamelog_table WHERE userID LIKE ? ORDER BY "+type+" desc";
      // 'GET' 요청일 때 추가 작업 수행
      const gamelogs = await new Promise((resolve, reject) => {
        // 'log_table' 테이블의 데이터 조회
        gamelogdb.query(queryString, [`%${search}%`], (error, results) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(results);
        });
      });
      queryString = "SELECT count(id) AS totalgame, (SUM(score)/COUNT(score)) AS averagescore, (SUM(playtime)/COUNT(playtime)) AS averageplaytime FROM gamelog_table WHERE userID LIKE ?";
      const gamedata = await new Promise((resolve, reject) => {
        // 'log_table' 테이블의 데이터 조회
        gamelogdb.query(queryString, [`%${search}%`], (error, results) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(results);
        });
      });
      // 'GET' 요청에 대한 응답
      res.json({ gamelogs: gamelogs, gamedata: gamedata[0] });
    
      // 연결 종료
    } catch (error) {
      console.error(error);
      // 에러를 적절히 처리하세요 (응답 보내거나 재전파)
      res.status(500).send('Internal Server Error', error);
    }
});


app.post("/logCreate", async (req, res) => {
	
	try {
		// 데이터베이스 연결
    let memberID = req.body.memberID;
    if (!req.body.memberID) {
      const token = req.body.token;
      const verified = jwt.verify(token, secretKey);
      memberID = verified.memberID
    }
		const type = req.body.type;
    const action = memberID+req.body.action;

		const queryString = "INSERT INTO log_table(id, time, memberID, type, action) VALUES((SELECT COALESCE(MAX(id), 0) + 1 FROM log_table ALIAS_FOR_SUBQUERY),now(),?,?,?)";

      // 'usertable' 테이블의 데이터 조회
    await memberlogdb.query(queryString,[memberID,type,action]);
	} catch (error) {
		console.error(error);
		// 에러를 적절히 처리하세요 (응답 보내거나 재전파)
		res.status(500).send('Internal Server Error', error);
	}
});

app.listen(PORT, () => {
  console.log(`running on port ${PORT}`);
});