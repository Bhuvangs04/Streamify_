import React, { useEffect, useState, lazy, Suspense } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast, Toaster } from "sonner";
import { useQuery } from "react-query";
import { X } from "lucide-react";
import CryptoJS from "crypto-js";

axios.defaults.withCredentials = true;

const SECRET_KEY = "SecureOnlyPassword"; // Keep this secret on the backend

const PaymentPlan = lazy(() => import("./PaymentPlan"));

// Fetch user role
const fetchUserRole = async () => {
  const response = await axios.get("https://streamizz.site/api/user/getRole", {
    withCredentials: true,
  });
  return response.data;
};

// Fetch available plans
const fetchPlans = async () => {
  const response = await axios.get("https://streamizz.site/api/payment/plans", {
    withCredentials: true,
  });
  return response.data.plans; // Return only the plans array
};

const PaymentPage = () => {
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const navigate = useNavigate();

  const {
    data: userRoleData,
    isLoading: isUserRoleLoading,
    isError: isUserRoleError,
  } = useQuery("userRole", fetchUserRole, {
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: 2,
  });

  const {
    data: plans,
    isLoading: isPlansLoading,
    isError: isPlansError,
  } = useQuery("plans", fetchPlans, {
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: 2,
  });

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const getUserDetails = async () => {
    try {
      // Get public IP
      const ipResponse = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipResponse.json();

      // Get location details using IP
      const locationResponse = await fetch(
        `https://ipapi.co/${ipData.ip}/json/`
      );
      const ipDetails = await locationResponse.json();

      return {
        ipDetails,
      };
    } catch (error) {
      console.error("Error fetching user details:", error);
      return null;
    }
  };

  const handlePayment = async (plan) => {
    try {
      if (userRoleData.user === "unBlocked") {
        toast.info(
          "You are already a subscription member. No payment is needed!",
          { duration: 5000 }
        );
        return;
      }

      const ipDetails = await getUserDetails();
      const ip = ipDetails.ipDetails.ip;
      const country = ipDetails.ipDetails.country_name;
      const city = ipDetails.ipDetails.city;
      const longitude =ipDetails.ipDetails.longitude;
      const network = ipDetails.ipDetails.network;
      const version = ipDetails.ipDetails.version;
      const latitude = ipDetails.ipDetails.latitude;

     const deviceDetails = {
       ip: ip,
       country: country,
       city: city,
       longitude: longitude,
       network: network,
       version: version,
       latitude:latitude,
     };

      const dataString = JSON.stringify(deviceDetails);
      const UserCode = CryptoJS.HmacSHA256(dataString, SECRET_KEY).toString(
        CryptoJS.enc.Base64
      );

      const response = await axios.post(
        "https://streamizz.site/api/payment/order",
        {
          options: {
            amount: plan.price * 100,
            currency: "INR",
            receipt: `${plan.id}`,
          },
          deviceDetails,
          UserCode,
        },
        { withCredentials: true }
      );

      const order = response.data.order;
      if (!order || !order.id) {
        throw new Error("Invalid order details.");
      }

      const keyID = import.meta.env.VITE_APP_RAZORPAY_KEY_ID;
      const options = {
        key: keyID,
        amount: plan.price * 100,
        currency: "INR",
        name: "Mini Netflix",
        description: `Subscription Plan for ${plan.devices} device(s)`,
        image: "https://example.com/your_logo",
        order_id: order.id,
        handler: async function (response) {
          try {
            const validationResponse = await axios.post(
              "https://streamizz.site/api/payment/order/validate",
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                Paid: plan.price,
                WatchBy: plan.devices,
                PlanName: plan.name,
                Month: plan.month,
                deviceDetails,
              },
              { withCredentials: true }
            );

            if (validationResponse.data.msg === "Success") {
              setSuccessMessage("Payment Successful!");
              setTimeout(() => {
                setSuccessMessage(null);
                navigate("/");
              }, 5000);
            } else {
              setError("Payment verification failed.");
              setTimeout(() => {
                setError(null);
              }, 5000);
            }
          } catch (error) {
            setError("Payment verification failed.");
            setTimeout(() => {
              setError(null);
            }, 5000);
          }
        },
        theme: { color: "#3399cc" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        setError("Payment failed. Please try again.");
        setTimeout(() => {
          setError(null);
        }, 5000);
      });
      rzp.open();
    } catch (error) {
      console.log(error)
      setError("Payment initiation failed.");
      setTimeout(() => {
        setError(null);
      }, 5000);
    }
  };

  if (isUserRoleLoading || isPlansLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9b87f5]"></div>
      </div>
    );
  }

  if (isUserRoleError || isPlansError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Failed to load data. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1F2C] text-white py-16 px-4">
      <Toaster position="top-center" richColors />
      <button
        onClick={() => navigate("/profile")}
        className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <X className="h-6 w-6 text-gray-500" />
      </button>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#9b87f5] to-[#D6BCFA] text-transparent bg-clip-text">
            Choose Your Plan
          </h1>
          <p className="text-[#8E9196] text-lg max-w-2xl mx-auto">
            Select the perfect subscription plan that suits your needs and enjoy
            unlimited streaming
          </p>
        </div>
        {successMessage && toast.success(successMessage, { duration: 5000 })}
        {error && toast.error(error, { duration: 5000 })}
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9b87f5]"></div>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan) => (
              <PaymentPlan
                key={plan.id}
                plan={plan}
                handlePayment={handlePayment}
              />
            ))}
          </div>
        </Suspense>
      </div>
    </div>
  );
};

export default PaymentPage;
