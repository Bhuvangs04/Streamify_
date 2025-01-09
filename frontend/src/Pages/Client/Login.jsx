import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import LoginForm from "@/components/login/login-form";
import LoginHeader from "@/components/login/login-header";
import LoginBackground from "@/components/login/LoginBackground";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import CryptoJS from "crypto-js";

const LoginPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const SECRET_KEY = "SecureOnlyPassword"; // Keep this secret on the backend

  // Function to determine device type
  const determineDeviceType = () => {
    const width = window.innerWidth;
    const userAgent = navigator.userAgent.toLowerCase();

    if (/mobile|android|iphone|ipad|ipod/.test(userAgent)) {
      if (width <= 768) {
        return "mobile";
      } else {
        return "tablet";
      }
    } else {
      return "laptop";
    }
  };

  // Function to get IP and location details
  const getUserDetails = async () => {
    try {
      // Get public IP
      const ipResponse = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipResponse.json();

      // Get location details using IP
      const locationResponse = await fetch(
        `https://ipapi.co/${ipData.ip}/json/`
      );
      const locationData = await locationResponse.json();

      return {
        ipAddress: ipData.ip,
        locationData,
      };
    } catch (error) {
      console.error("Error fetching user details:", error);
      return null;
    }
  };

  const handleLogin = async (email, password) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const userDetails = await getUserDetails();
      if (!userDetails) {
        setErrorMessage("Unable to fetch location details.");
        setIsLoading(false);
        return;
      }

      const data = {
        email,
        password,
        locations: userDetails.locationData,
        deviceDetails: {
          userAgent: navigator.userAgent,
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
          platform: navigator.platform,
          deviceType: determineDeviceType(),
        },
      };

      // Get IP and location details

      const dataString = JSON.stringify(data);
      const hash = CryptoJS.HmacSHA256(dataString, SECRET_KEY).toString(
        CryptoJS.enc.Base64
      );

      // Send login request with additional details
      const response = await axios.post(
        "http://localhost:8081/api/netflix/login",
        {
          data,
          hash,
        }
      );

    
        if (response.data.message === "Login successful") {
          if (response.data.role === "user") {
            const streamingResponse = await axios.post(
              "http://localhost:8081/api/user/start-streaming",
              { deviceDetails: data.deviceDetails },
              { withCredentials: true }
            );

            const { deviceToken, message } = streamingResponse.data;
            localStorage.setItem("authToken", deviceToken);

            if (message.includes("update payment")) {
              navigate("/pay");
            } else if (message.includes("account is blocked")) {
              alert("Your account is blocked. Please contact support.");
            }
          }

          if (response.data.role === "admin") {
            navigate("/users/statics");
          } else {
            const paymentResponse = await axios.get(
              "http://localhost:8081/api/payment/check-payment",
              { withCredentials: true }
            );

            if (paymentResponse.data.showPaymentReminder) {
              navigate("/payment-reminder");
            } else {
              navigate("/");
            }
  
          }
        } else {
          setErrorMessage("Login failed. Please try again.");
        }
    } catch (error) {
        if (
          error.response?.data?.message.includes(
            "Your account has been locked due to suspicious activity"
          )
        ) {
          navigate("/suspend");
        }
      setErrorMessage(
        error.response?.data?.message || "An error occurred. Please try again."
      );
                
    } finally {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <LoginBackground />

      <motion.div
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="backdrop-blur-md bg-black/80 border-netflix-darkgray shadow-2xl">
          <LoginHeader />
          <LoginForm
            onSubmit={handleLogin}
            isLoading={isLoading}
            errorMessage={errorMessage}
          />
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginPage;
