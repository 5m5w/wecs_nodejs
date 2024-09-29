const mongo = require("mongodb");
require('dotenv').config(); // 引用 .env 檔案中的資料
const uri = process.env.MONGODB_URI; // 從環境變數中讀取 MONGODB_URI
const client = new mongo.MongoClient(uri);
const session = require("express-session");
let db = null;
let collection = null;

const express = require("express"); // 載入express 第三方模組
const app = express(); //建立express的app物件
app.set("view engine", 'ejs'); // 設定樣板引擎
app.set("views", "./views"); // 設定樣板引擎資料夾
app.use(express.static("public")); // 設定靜態檔案資料夾
app.use('/picuploads', express.static('picuploads')); //將 picuploads 資料夾設定為靜態（本地主機）
app.use(express.urlencoded({ extended: true })); //設定post接收方法
const multer = require("multer"); // 檔案上傳處理套件
const path = require("path"); // 檔案上傳的設定路徑
const cloudinary = require('cloudinary').v2; //雲端圖片伺服器
const bcrypt = require('bcrypt'); // 註冊密碼加密
const saltRounds = 10; // 定義加密強度，通常設為 10


// mongodb資料庫連線
async function initDB() {
    try {
        await client.connect();
        console.log("資料庫連線成功");

        db = client.db("test1");
        collection = db.collection("member");

        // await collection.insertOne({
        //     name: "123",
        //     email:"123@123.com",
        //     password: "123"
        // });

    } catch (err) {
        console.log("資料庫連線失敗", err);
    } finally {
    }
}
initDB();

app.use(session({
    secret: "wecs",
    resave: false,
    saveUninitialized: true
}));

// 設置 Cloudinary 配置
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// 使用 Multer 處理本地上傳
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'picuploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});


// 設定上傳的限制，例如最大檔案大小
const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 5 } // 最大5MB
});

// 啟動伺服器 http://localhost:3000/
app.listen(3000, function () {
    console.log("server started!");
});

// 建立首頁路由
app.get("/", function (req, res) {
    res.render("mainpage1_wecs.ejs");
});

// 註冊頁面路由
app.get('/signup', async function (req, res) {
    res.render("signup.ejs");
});

// 上傳註冊的資料
app.post("/signup", upload.single('profilePic'), async (req, res) => {
    try {
        // 检查是否有文件上传
        if (!req.file) {
            console.log("没有上传文件。");
            return res.status(400).send('必须上传图片');
        }

        console.log("文件上传成功:", req.file.path);

        // 上传到 Cloudinary
        const result = await cloudinary.uploader.upload(req.file.path, { folder: 'user_profile_pics' });
        console.log("图片已上传到 Cloudinary:", result.secure_url);

        const photoUrl = result.secure_url; //获取上传图片的url

        // 处理其他表单数据
        const { name, email, password, dob, phone, gender, experience, location, certifications, languages } = req.body;
        
        if (!name || !email || !password) {
            console.log("缺少必填字段。");
            return res.status(400).send('请填写所有必填栏位');
        }

        // 检查邮箱是否已存在
        const collection = db.collection('member');
        const existingUser = await collection.findOne({ email });
        if (existingUser) {
            console.log("邮箱已注册。");
            return res.status(400).send('该 Email 已经注册');
        }

        // 密码加密
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        console.log("密码加密成功。");

        // 创建用户对象
        const user = {
            name,
            email,
            password: hashedPassword,
            dob,
            phone,
            gender,
            experience,
            location: Array.isArray(location) ? location : [location],
            certifications: Array.isArray(certifications) ? certifications : [certifications],
            languages: Array.isArray(languages) ? languages : [languages],
            profilePic: photoUrl
        };

        // 将用户数据插入 MongoDB
        await collection.insertOne(user);
        console.log("用户数据已插入 MongoDB。");

        // 设置 session 数据
        req.session.member = { name, email, profilePic: photoUrl };
        console.log("Session 更新成功。");

        // 重定向到 memberdata.ejs 页面
        res.redirect('/memberdata');
    } catch (error) {
        console.error('发生错误:', error);
        res.status(500).send('服务器错误');
    }
});

// 添加 memberdata 路由
app.get('/memberdata', async (req, res) => {
    if (!req.session.member) {
        return res.redirect('/signin'); // 如果用户未登录，重定向到登录页面
    }
    
    try {
        const collection = db.collection('member');
        const memberData = await collection.findOne({ email: req.session.member.email });
        
        if (!memberData) {
            return res.status(404).send('找不到会员数据');
        }
        
        res.render('memberdata.ejs', { member: memberData });
    } catch (error) {
        console.error('获取会员数据时出错:', error);
        res.status(500).send('服务器错误');
    }
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

// 验证用户登录
app.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 根据邮箱查找用户
        const collection = db.collection("member");
        let user = await collection.findOne({ email: email });

        if (user === null) {
            // 如果用户不存在，返回错误信息
            return res.status(400).send('用户未注册');
        }

        // 验证密码
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // 如果密码不正确，返回错误信息
            return res.status(400).send('密码错误');
        }

        // 登录成功，记录会员信息在session中
        req.session.member = {
            name: user.name,
            email: user.email,
            profilePic: user.profilePic
        };
        res.redirect('/memberdata');

    } catch (err) {
        console.error(err);
        res.status(500).send('服务器错误');
    }
});

// 成功登入後跳轉的頁面
app.get('/success', (req, res) => {
    res.send('登入成功');
});