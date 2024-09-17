const mongo=require("mongodb");
const uri="mongodb+srv://jacob:jacob123@jacoblearning.ubzs3.mongodb.net/?retryWrites=true&w=majority&appName=JacobLearning";
const client=new mongo.MongoClient(uri);
let db=null;
let collection=null;

async function initDB() {
    try {
        await client.connect();
        console.log("資料庫連線成功");

        db=client.db("test1");
        collection=db.collection("userTest1");

        await collection.insertOne({
           email:"123@123.com",
           user: "test1"
        });

        
    }catch(err){
        console.log("資料庫連線失敗", err);
    }finally{
        await client.close();
        console.log("資料庫連線已關閉");
    }
}
initDB();