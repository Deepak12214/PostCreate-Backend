const express = require('express');
const app = express();
const userModel = require('./models/user');
const postModel = require('./models/post');
const path = require('path');
const bcrypt=require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const post = require('./models/post');

app.set('view engine', 'ejs');
app.use('/dist', express.static(path.join(__dirname, 'dist')));
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,'public')));
app.use(cookieParser());


app.get('/' , (req,res)=>{
    res.render('index');
})
app.post('/register' , async (req,res)=>{
    const  {email,password,username,name,age} = req.body;
    let user = await userModel.findOne({email});
    console.log(user);
    if(user) return res.status(300).send('User already registered');

    // Generate salt and hash the password
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Create new user
    user = await userModel.create({
        username,
        name,
        age,
        email,
        password: hash
    });
    
    const token =jwt.sign({email : email , userid : user._id} , 'Screate');
    res.cookie('token' , token);
    res.send('regertered');
})

app.get('/login' , (req , res)=>{
    res.render('login');
})

app.post('/login', async (req,res)=>{
    const {email,password} = req.body;
     let user = await userModel.findOne({email});
     if(!user)  return res.status(500).send('Something went wrong');

     bcrypt.compare(password,user.password , (err,result)=>{
        if(result) {
            const token =jwt.sign({email : email , userid : user._id} , 'Screate');
            res.cookie('token' , token);
            res.redirect('/profile');
        }
        else res.redirect('/login');
     })
})

app.get('/logout' , (req,res)=>{
    res.cookie('token' , '');
    res.redirect('/login');
})

app.get('/profile' ,isLoggedIn ,async (req,res)=>{
    const user = await userModel.findOne({email : req.user.email});
    await user.populate('posts');
    res.render('profile' , {user});
})

app.post('/post' ,isLoggedIn, async (req,res)=>{
    let user = await userModel.findOne({email:req.user.email});
    const {content} =req.body;
    const post = await postModel.create({
        user : user._id,
        content
    });

    user.posts.push(post._id);
    await user.save();
    res.redirect('/profile');
})

app.get('/like/:id' , isLoggedIn , async (req,res)=>{
    const post = await postModel.findOne({_id : req.params.id }).populate('user');
    const redirectUrl = req.query.redirectUrl || '/';
    if(post.likes.indexOf(req.user.userid) === -1){
       post.likes.push(req.user.userid); 
    }
    else{
        post.likes.splice(post.likes.indexOf(req.user.userid) , 1);
    }
    await post.save();
    res.redirect(redirectUrl);
})
app.get('/edit/:id' , isLoggedIn , async (req,res)=>{
    const post = await postModel.findOne({_id : req.params.id }).populate('user');
    res.render('edit' ,{post})
})
app.post('/update/:id' ,isLoggedIn, async (req,res)=>{
    const post = await postModel.findOneAndUpdate({_id : req.params.id} , {content : req.body.content})
    res.redirect('/profile');
})


app.get('/forget' , (req,res)=>{
    res.render('forget');
})

app.post('/forget/password' ,async (req,res)=>{
    const {email,password} = req.body;
     let user = await userModel.findOne({email});
     if(!user)  return res.status(500).send('Something went wrong');
     const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
     const post = await userModel.findOneAndUpdate({email} , {password : hash});
     res.redirect('/login');
} )
app.get('/home', isLoggedIn ,async (req,res)=>{
    const user = await userModel.findOne({email : req.user.email});
    const posts = await postModel.find({}).populate('user');
    res.render('home' , {posts , user});
})
function isLoggedIn(req,res,next){
    const token = req.cookies.token;
    if(token === '') res.send('you must be logged in');
    else{
        let data = jwt.verify(token,'Screate');
        req.user = data;
        next();
    }
}
app.listen(3000);


















// app.post('/create' ,  (req,res)=>{
//     let {username , age , email , password} = req.body;

//     bcrypt.genSalt(10, (err, salt)=> {
//         bcrypt.hash(password, salt, async (err, hash)=> {
//            const createdUser = await userModel.create({
//             username ,
//             age,
//             email,
//             password : hash
//         });
//         const token = jwt.sign({email} , 'screat');
//         res.cookie('token' , token);
//         res.send(createdUser); 

//         });
//     }); 
// })

// app.get('/logout' , (req,res)=>{
//     res.cookie('token','');
//     res.redirect('/'); 
// })

// app.get('/login' , (req,res)=>{
//     res.render('login');
// })

// app.post('/login' , async (req,res)=>{
//     let user =await userModel.findOne({email : req.body.email});
//     if(!user) return res.send('Something is wrong 1');

//     bcrypt.compare(req.body.password, user.password, (err,result)=> {
//         if(!result) return res.send('Something is wrong 2');
//         let token = jwt.sign({email : user.email} , 'screate');
//         res.cookie('token',token);
//         res.send('yes , you are login ');
//     });

// })
