const mongo=require("mongodb");
require('dotenv').config(); // 引用 .env 檔案中的資料
const uri = process.env.MONGODB_URI; // 從環境變數中讀取 MONGODB_URI
const client=new mongo.MongoClient(uri);
const session=require("express-session");
let db=null;
let collection=null;

async function initDB() {
    try {
        await client.connect();
        console.log("資料庫連線成功");

        db=client.db("test1");
        collection=db.collection("member");
        
        // await collection.insertOne({
        //     name: "123",
        //     email:"123@123.com",
        //     password: "123"
        // });
       
    }catch(err){
        console.log("資料庫連線失敗", err);
    }finally{
    }
}
initDB();

const express = require("express"); // 載入express 第三方模組
const app = express(); //建立express的app物件
app.set("view engine", 'ejs'); // 設定樣板引擎
app.set("views", "./views"); // 設定樣板引擎資料夾
app.use(express.static("public")); // 設定靜態檔案資料夾
app.use('/picuploads', express.static('picuploads')); //將 uploads/ 資料夾設定為靜態資源
app.use(express.urlencoded({extended:true})); //設定post接收方法
const multer = require("multer"); // 檔案上傳處理套件
const path = require("path"); // 檔案上傳的設定路徑

app.use(session({
    secret:"wecs",
    resave:false,
    saveUninitialized:true
}));

// 建立首頁路由
app.get("/", function(req, res){
    res.render("login.ejs");
});
// 啟動伺服器 http://localhost:3000/
app.listen(3000, function(){
    console.log("server started!");
});

// 在這裡處理註冊邏輯，例如保存使用者資料
app.post('/register', (req, res) => {
    console.log("User is registering...");
    res.redirect('/register-page');  // 重定向到註冊成功的頁面
});