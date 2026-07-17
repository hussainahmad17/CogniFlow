// this files is load data into the database

import { DataAPIClient } from "@datastax/astra-db-ts";
import { PuppeteerWebBaseLoader} from "langchain/document_loaders/web/puppeteer";
import Openai from "openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";


import "dotenv/config";
const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_APPLICATION_TOKEN,
    OPENAI_API_KEY,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_COLLECTION
} = process.env;


const openai = new Openai({
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
const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });

const spliter = new RecursiveCharacterTextSplitter({
    chunkSize: 512,
    chunkOverlap: 100
})

const create_collection = async () => {
    const response = await db.createCollection(ASTRA_DB_COLLECTION, {
        vector: {
            dimension: 1536,
            metric: "cosine",
        }
    })
    console.log("Collection created:", response);
}

