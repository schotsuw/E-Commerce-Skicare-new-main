const  port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { type } = require("os");
const { error } = require("console");

app.use(express.json()); // parse all the request through json
app.use(cors()); // connect express app in 4000 port

// Database Connection with MongoDB
mongoose.connect("mongodb+srv://schotsuw:Ohm22052546@cluster0.0vqkpxy.mongodb.net/e-commmerce");

// API Creation 

app.get('/', function(req, res) {
    res.send("Express App is Running");
})

// Image Storage Engine
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
      console.log(file);
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

// Schema for Creating Product

const Product = mongoose.model("Product", {
    id:{
        type: Number,
        required: true,
    },
    name:{
        type: String,
        required: true,
    },
    image:{
        type: String,
        required: true,
    },
    category:{
        type: String,
        required: true,
    },
    new_price:{
        type: Number,
        required: true,
    },
    old_price:{
        type: Number,
        required: true,
    },
    date:{
        type: Date,
        default:Date.now,
    },
    available:{
        type: Boolean,
        default: true,
    }
})

app.post('/addproduct', async (req,res) => {
    let products = await Product.find({}); // find all the products, and get all the products stored in this array
    let id;
    if(products.length > 0){ //means products are available on our datatbase
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id + 1;
    }
    else{ //no products
        id = 1;
    }
    const product = new Product({
        id: id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success:true,
        name:req.body.name,
    })
})
// Creating Upload Endpoint for image
const upload = multer({storage: storage})
app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:4000/images/${req.file.filename}`
    })
})
app.use('/images', express.static('upload/images'));

app.use('./images', express.static('upload/images')) // create static endpoint

// Creating API for deleting the products

app.post('/removeproduct', async (req, res) => {
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        success:true,
        name:req.body.name,
    })
})

// Creating API for getting all products
app.get('/allproducts', async(req, res) => {
    let products = await Product.find({});
    console.log('All Products Fetched');
    res.send(products);
})

// Shema creating for User model
const Users = mongoose.model("Users", {
    name: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
    },
    password: {
      type: String,
    },
    cartData: {
      type: Object,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  });

//Create an endpoint for regestring the user in data base & sending token
app.post('/signup', async (req, res) => {
    console.log("Sign Up");
          let success = false;
          let check = await Users.findOne({ email: req.body.email });
          if (check) {
              return res.status(400).json({ success: success, errors: "existing user found with this same email" });
          }
          let cart = {};
            for (let i = 0; i < 300; i++) {
            cart[i] = 0;
          }
          const user = new Users({
              name: req.body.username,
              email: req.body.email,
              password: req.body.password,
              cartData: cart,
          });
          await user.save();
          const data = {
              user: {
                  id: user.id
              }
          }
          
          const token = jwt.sign(data, 'secret_ecom');
          success = true; 
          res.json({ success, token })
      })


//Create an endpoint at ip/login for login the user and giving auth-token
app.post('/login', async (req, res) => {
    console.log("Login");
      let success = false;
      let user = await Users.findOne({ email: req.body.email });
      if (user) {
          const passCompare = req.body.password === user.password;
          if (passCompare) {
              const data = {
                  user: {
                      id: user.id
                  }
              }
              success = true;
        console.log(user.id);
              const token = jwt.sign(data, 'secret_ecom');
              res.json({ success, token });
          }
          else {
              return res.status(400).json({success: success, errors: "please try with correct email/password"})
          }
      }
      else {
          return res.status(400).json({success: success, errors: "please try with correct email/password"})
      }
  })


// Creating EndPoint for newcollection data
app.get("/newcollections", async (req, res) => {
	let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("New Collections Fetched");
    res.send(newcollection);
});

// Creating EndPoint for popular in women section
app.get('/popularinwomen', async (req,res) => {
    let products = await Product.find({category:"women"});
    let popular_in_women = products.slice(0,4);
    console.log("Popular in women fetched");
    res.send(popular_in_women);
});

// Creating Middleware to fetch user 
const fetchUser = async(req,res,next) => {
    const token = req.header('auth-token');
    if(!token){
            res.status(401).send({errors:"Please authenticate using valid token"})
    }
    else{
        try {
            const data = jwt.verify(token,'secret_ecom');
            req.user = data.user;
            next();
        } catch (error) {
            res.status(401).send({errors:"please authenticate using valid token"})
        }
    }
} 


//Creating Endpoint for adding products in cartdata
app.post('/addtocart', fetchUser, async(req,res)=>{
    //console.log(req.body, req.user);
    console.log("Added", req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})
    res.send("Added")
})

// Creating endpoint to remove endpoint to remove products from cartdata
app.post('/removefromcart', fetchUser, async(req,res) => {
    console.log("removed", req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId] > 0){
        userData.cartData[req.body.itemId] -= 1;
    }
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData})
    res.send("Removed")
})
 //Create an endpoint for saving the product in cart
 app.post('/getcart', fetchUser, async (req, res) => {
    console.log("Get Cart");
    let userData = await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);
  
    })


app.listen(port, (error) =>{
    if(!error){
        console.log("Server runing on port " + port);
    }
    else{
        console.log('Error : ' + error);
    }
});