const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config();

const port = process.env.PORT || 5000;

// middlewear
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://blog-website-4e728.web.app',
        'https://blog-website-4e728.firebaseapp.com/'
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
    const token = req?.cookies?.token;
    if (!token) {
        return res.status(401).send({ message: 'unAuthorized access' })
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unAuthorized access' })
        }
        req.user = decoded;
        next();
    })
}

// connect with mongodb
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.tye2x.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // blog collection
        const blogCollection = client.db('blogDB').collection('blog');
        //wishList collection
        const wishlistCollection = client.db('blogDB').collection('wishlist');
        // comment collection
        const commentCollection = client.db('blogDB').collection('comments');

        // user collection
        const userCollection = client.db('blogDB').collection('users');


        // Auth related API (JWT)
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '10h' });
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production'
                })
                .send({ success: true });
        })


        // for getting data from add blog form in the client side (create)
        app.post('/blogs', verifyToken, async (req, res) => {
            const newBlog = req.body;
            const result = await blogCollection.insertOne(newBlog);
            res.send(result);
        })

        // for reading all blog data in the server site for using in the client site that are already saved in the mongodb(read)
        app.get('/blogs', async (req, res) => {
            const allBlogs = blogCollection.find();
            const result = await allBlogs.toArray();
            res.send(result);
        });

        // for reading blogDetails by id
        app.get('/blogs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await blogCollection.findOne(query);
            res.send(result)
        });

        // POST: Add a new comment
        app.post('/comments', async (req, res) => {
            const newComment = req.body;
            const result = await commentCollection.insertOne(newComment);
            res.send(result);
        });

        // GET: Fetch comments for a specific blog
        app.get('/comments', async (req, res) => {
            const blogId = req.query.blogId;
            const query = { blogId: blogId };
            const result = await commentCollection.find(query).toArray();
            res.send(result);
        });



        // for reading only6 recent blog posts
        app.get('/recentBlogs', async (req, res) => {
            const result = await blogCollection
                .find()
                .sort({ createdAt: -1 }) // latest first
                .limit(6) // only 6 recent blogs
                .toArray();
            res.send(result);
        });

        // for filter by category 
        app.get('/categories', async (req, res) => {
            const categories = await blogCollection.distinct("category");
            res.send(categories);
        });

        // Search blogs by title
        app.get('/searchBlogs', async (req, res) => {
            // Get search keyword from frontend
            const searchQuery = req.query.q;

            let filter = {};
            if (searchQuery) {
                filter = { title: { $regex: searchQuery, $options: "i" } };
                // $regex = partial match, "i" = case-insensitive
            }

            const result = await blogCollection.find(filter).toArray();
            res.send(result);
        });

        // to get watchlist from frontend
        app.post('/wishlist', async (req, res) => {
            const item = req.body;
            const result = await wishlistCollection.insertOne(item);
            res.send(result);
        });

        app.get('/wishlist', verifyToken, async (req, res) => {
            const email = req.query.email;
            const query = { email: email }

            if (req.user.email !== req.query.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const result = await wishlistCollection.find(query).toArray();
            res.send(result);
        })

        // delete from wishlist
        app.delete('/wishlist/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await wishlistCollection.deleteOne(query);
            res.send(result);
        })


        // UPDATE blog by id
        app.put('/blogs/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true }; // creates a new doc if not found (optional)
            const updatedBlog = req.body;

            const blog = {
                $set: {
                    title: updatedBlog.title,
                    blogImage: updatedBlog.blogImage,
                    category: updatedBlog.category,
                    shortDescription: updatedBlog.shortDescription,
                    longDescription: updatedBlog.longDescription,
                    email: updatedBlog.email, // blog owner email
                    name: updatedBlog.name,   // blog owner name
                    authorImage: updatedBlog.authorImage,
                    createdAt: updatedBlog.createdAt || new Date()
                }
            };

            const result = await blogCollection.updateOne(filter, blog, options);
            res.send(result);
        });


        // users related API (create user)
        app.post('/users', async (req, res) => {
            const newUser = req.body;
            console.log(newUser);
            const result = await userCollection.insertOne(newUser);
            res.send(result);

        });

        // Read users

        app.get('/users', async (req, res) => {
            const cursor = userCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        });


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Blog website server side is running')
})

app.listen(port, () => {
    console.log(`Blog website server is running at: ${port}`);
})