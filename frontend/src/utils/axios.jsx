// utils/axios.js
import axios from "axios";
axios.defaults.withCredentials = true;

const instance = axios.create({
  baseURL: "https://streamify-o1ga.onrender.com/api", // Update with your API base URL
  withCredentials: true, // If you need to send credentials like cookies or tokens
});

export default instance;
