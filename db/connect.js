import mongoose from "mongoose";
import { DBName } from "../src/constants.js";

const connectDB = async () => {
  try {
    const DbConnection = await mongoose.connect(
      `${process.env.CONNECT_DB_STR}/${DBName}`
    );
    console.log(
      `Successfully connected to Database on :${DbConnection.connection.host}`
    );
  } catch (error) {
    console.log("error ocurred.");
    console.log(error);
    process.exit(1);
  }
};
export default connectDB;
