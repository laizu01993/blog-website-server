const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
require('dotenv').config();

const port = process.env.PORT || 5000;

// middlewear
app.use(cors());
app.use(express.json());

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
        await client.connect();

        // collection
        const blogCollection = client.db('blogDB').collection('blog');

        // for getting data from add blog form in the client side (create)
        app.post('/blogs', async (req, res) => {
            const newBlog = req.body;
            const result = await blogCollection.insertOne(newBlog);
            res.send(result);
        })

        // for reading all blog data in the server site for using in the client site that are already saved in the mongodb(read)
        app.get('/blogs', async (req, res) => {
            const allBlogs = blogCollection.find();
            const result = await allBlogs.toArray();
            res.send(result);
        })

        // for reading only6 recent blog posts
        app.get('/recentBlogs', async (req, res) => {
            const result = await blogCollection
                .find()
                .sort({ createdAt: -1 }) // latest first
                .limit(6) // only 6 recent blogs
                .toArray();
            res.send(result);
        });
        app.get('/categories', async (req, res) => {
            const categories = await blogCollection.distinct("category");
            res.send(categories);
        });



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
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