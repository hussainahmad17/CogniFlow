// this file loads data into the database

import { DataAPIClient } from "@datastax/astra-db-ts";
import { OpenAI } from "openai";
import puppeteer from "puppeteer";

import "dotenv/config";

const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_KEYSPACE,
    ASTRA_DB_APPLICATION_TOKEN,
    OPENAI_API_KEY,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_COLLECTION,
} = process.env;

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

const f1Data = [
  "https://en.wikipedia.org/wiki/Formula_One",
  "https://www.skysports.com/f1/news/12433/13117256/lewis-hamilton-says-move-to-ferrari",
  "https://www.formula1.com/en/latest/all",
  "https://www.forbes.com/sites/brettknight/2023/11/29/formula-1s-highest-paid-drivers/",
  "https://www.autosport.com/f1/news/history-of-female-f1-drivers-including-grand-prix-racers/",
  "https://en.wikipedia.org/wiki/2023_Formula_One_World_Championship",
  "https://en.wikipedia.org/wiki/2022_Formula_One_World_Championship",
  "https://en.wikipedia.org/wiki/List_of_Formula_One_World_Drivers%27_Champions",
  "https://en.wikipedia.org/wiki/2024_Formula_One_World_Championship",
  "https://www.formula1.com/en/results.html/2024/races.html",
  "https://www.formula1.com/en/racing/2024.html"
];

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_API_ENDPOINT, {
    keyspace: ASTRA_DB_KEYSPACE ?? ASTRA_DB_NAMESPACE,
});

const chunkText = (content: string) => {
    const chunkSize = 512;
    const chunkOverlap = 100;
    const chunks: string[] = [];

    let start = 0;
    while (start < content.length) {
        const end = Math.min(start + chunkSize, content.length);
        const chunk = content.slice(start, end).trim();

        if (chunk.length > 0) {
            chunks.push(chunk);
        }

        if (end >= content.length) {
            break;
        }

        start = Math.max(end - chunkOverlap, start + 1);
    }

    return chunks;
};

const create_collection = async () => {
    const response = await db.createCollection(ASTRA_DB_COLLECTION, {
        vector: {
            dimension: 1536,
            metric: "cosine",
        }
    })
    console.log("Collection created:", response);
}


// load the data

const loadData = async () => {
    const collection = db.collection(ASTRA_DB_COLLECTION);
    for (const url of f1Data) {
        const content = await scrapePage(url);
        const chunks = chunkText(content);
        const embeddings = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: chunks,
            encoding_format: "float",
        });

        for (let index = 0; index < chunks.length; index += 1) {
            const embedding = embeddings.data[index]?.embedding;

            if (!embedding) {
                continue;
            }

            await collection.insertOne({
                $vector: embedding,
                text: chunks[index],
                source: url,
            });
        }
    }
}


// scrape the page content

const scrapePage = async (url: string) => {
    const browser = await puppeteer.launch({ headless: true });

    try {
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "networkidle2" });

        const content = await page.evaluate(() => document.body.innerText);
        return content.replace(/\s+/g, " ").trim();
    } finally {
        await browser.close();
    }
}


//  create collectiona and load data

create_collection().then(() => {
    loadData()}).catch((err) => {
    console.error("Error creating collection or loading data:", err);
})