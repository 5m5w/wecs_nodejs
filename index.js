const mongo=require("mongodb");
require('dotenv').config(); // 引用 .env 檔案中的資料
const uri = process.env.MONGODB_URI; // 從環境變數中讀取 MONGODB_URI
const client=new mongo.MongoClient(uri);
const session=require("express-session");
let db=null;
let collection=null;
let email = "";
let name = "";

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

// 建立需要的路由
app.get("/", function(req, res){
    res.render("index.ejs");
});

// 註冊會員功能路由
app.post("/signup", async function(req, res){
    const name=req.body.name;
    const email=req.body.email;
    const password=req.body.password;
    // 檢查資料庫中的資料
    const collection=db.collection("member");
    let result=await collection.findOne({
        email:email
    });
    if(result!==null){
        res.redirect("/error?msg=註冊失敗, 該信箱已註冊過");
        return
    }
    result = await collection.insertOne({
        name:name, email:email, password:password
    });
    res.redirect("/");
});

// 登入會員功能路由
app.post("/signin", async function (req, res) {
    const email=req.body.email;
    const password=req.body.password;
    // 檢查資料庫中的資料
    const collection = db.collection("member");
    let result = await collection.findOne({
        $and:[
            {email:email},
            {password:password}
        ]
    })
    if(result===null){ // 沒有對應的使用者資料，故登入失敗
        res.redirect("/error?msg=郵箱或密碼輸入錯誤")
        return;
    }
    // 登入成功，紀錄會員資訊在 session 中
    req.session.member=result;
    res.redirect("/member");
});
// 登出會員路由
app.get("/signout", function(req, res){
    req.session.member=null; // 使用者狀態設為空值，即為登出
    res.redirect("/");
});

// 會員頁面
app.get("/member", async function(req, res){
    // 如果沒有透過登入程序，就直接進去member頁面，會導回首頁
    if(!req.session.member){
        res.redirect("/");
        return;
    }
    // 從session 取得登入會員的名稱
    const name=req.session.member.name;
    const profilePic = req.session.member.profilePic; // 從 session 取得照片路徑
    // 取得所有會員名稱
    const collection=db.collection("member");
    let result=await collection.find({
        name:name
    });
    let data=[];
    await result.forEach(function(member){
        data.push(member);
    })
    res.render("member.ejs",{name:name, profilePic: profilePic,data:data});
});
app.get("/error", function(req, res){
    const msg=req.query.msg;
    res.render("error.ejs", {msg:msg});
});

// 照片上傳設定存儲位置和檔名
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'picuploads/'); // 照片將存儲到 uploads 資料夾中
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); // 照片名稱將為唯一時間戳+副檔名
    }
});
// 設定上傳的限制，例如最大檔案大小
const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 } // 最大5MB
});
// 在你的路由中使用 multer 來處理照片上傳
app.post("/upload", upload.single('profilePic'), async (req, res) => {
    if (!req.session.member) {
        res.redirect("/error?msg=未登入");
        return;
    }
    try {
        // 檔案上傳成功，儲存檔案路徑到資料庫
        const filePath = '/picuploads/' + req.file.filename;

        // 更新會員資料，將照片路徑儲存到資料庫
        const collection = db.collection("member");
        await collection.updateOne(
            { email: req.session.member.email }, // 使用 email 作為識別
            { $set: { profilePic: filePath } } // 更新 profilePic 欄位
        );
        // 更新 session 中的會員資料
        req.session.member.profilePic = filePath;
        res.redirect("/member");
    } catch (err) {
        console.log("照片上傳錯誤", err);
        res.redirect("/error?msg=照片上傳失敗");
    }
});

// 會員資料更新提交
app.post('/submit', async (req, res) => {
    try {
        const { name, email, dob, phone, gender, experience, location, certifications, languages } = req.body;
        // 假設你會在實際應用中處理上傳的圖片，這裡簡化為空字串
        const photo = '';

        const user = {
            name,
            email,
            dob,
            phone,
            gender,
            experience,
            location,
            certifications,
            languages,
            photo
        };

        // 儲存使用者資料到 MongoDB
        const collection = db.collection('member');
        await collection.insertOne(user);

        // 設定 session 資料（假設這樣做）
        req.session.member = { name, profilePic: photo };

        // 重定向到 /memberdata
        res.redirect('/memberdata');
    } catch (error) {
        console.error('Error saving user data:', error);
        res.status(500).send('伺服器錯誤');
    }
});

// 會員資料頁面
app.get('/memberdata', async (req, res) => {
    if (!req.session.member) {
        res.redirect('/');
        return;
    }

    const name = req.session.member.name;
    const profilePic = req.session.member.profilePic;

    // 取得使用者資料
    const collection = db.collection('member');
    const result = await collection.findOne({ name: name });

    if (!result) {
        res.redirect('/error?msg=找不到會員資料');
        return;
    }

    res.render('memberdata.ejs', { name, profilePic, data: result });
});

// 啟動伺服器 http://localhost:3000/
app.listen(3000, function(){
    console.log("server started!");
});

