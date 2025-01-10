import { useState } from "react";
import { format } from "date-fns";
import {
  FiAlertTriangle,
  FiUser,
  FiClock,
  FiMapPin,
  FiLock,
  FiUnlock,
} from "react-icons/fi";
import { useQuery } from "react-query";
import {X} from "lucide-react";
import {useNavigate} from "react-router-dom"
import { toast } from "sonner";


const fetchSuspiciousActivities = async (page, limit) => {
  const response = await fetch(
    `https://streamify-o1ga.onrender.com/api/admin/Suspicous-Act?page=${page}&limit=${limit}`,{
        credentials:"include"
    }
  );
  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }
  return response.json();
};

const lockAccount = async (userId, status) => {
  try {
    const response = await fetch(`https://streamify-o1ga.onrender.com/api/admin/lock/account/${userId}/${status}`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to update account status");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating account status:", error);
    throw error;
  }
};

  const handleAccountStatus = async (order,status) => {
    try {
      await lockAccount(order.userId, status);
      toast.success(
        status ? "Account locked successfully" : "Account unlocked successfully"
      );
      onStatusChange();
    } catch (error) {
      toast.error(
        status ? "Failed to lock account" : "Failed to unlock account"
      );
      console.error("Error:", error);
    }
  };


const SuspiciousActivities = () => {
  const [activeTab, setActiveTab] = useState("orders");
  const currentPage = 1;
  const limit = 10;
    const navigate = useNavigate();



   const { data, isLoading, error } = useQuery(
     ["suspiciousActivities", currentPage, limit],
     () => fetchSuspiciousActivities(currentPage, limit),
     {
       keepPreviousData: true,
     }
   );

   if (isLoading) return <div>Loading...</div>;
   if (error) return <div>Error: {error.message}</div>;

   const activities = data;

  const renderSuspiciousOrders = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
 

      {activities.suspiciousOrders.map((order) => (
        <div
          key={order._id}
          className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-red-500 hover:shadow-xl transition-shadow duration-200"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <FiAlertTriangle className="text-red-500 text-xl mr-2" />
              <h3 className="text-lg text-gray-600 font-semibold">
                Suspicious Order
              </h3>
            </div>
            {order.status === "pending" && (
              <button
                onClick={() => handleAccountStatus(order,true)}
                className="flex items-center px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                <FiLock className="mr-1" />
                Lock Account
              </button>
            )}
            {order.status === "locked" && (
              <button
                onClick={() => handleAccountStatus(order,false)}
                className="flex items-center px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                <FiUnlock className="mr-1" />
                Unlock Account
              </button>
            )}
            {order.status === "resolved" && (
              <span className="text-green-500 font-medium">Resolved</span>
            )}
          </div>
          <div className="space-y-2">
            <p className="flex items-center text-gray-700">
              <FiUser className="mr-2 text-yellow-500" />
              User Id: {order.userId}
            </p>
            <p className="flex items-center text-gray-700">
              <span className="font-medium">Amount recivied:{" "}{(order.amount*100)}{""}</span>{" "}
              {order.currency}
            </p>
            <p className="flex items-center text-gray-700">
              <FiUser className="mr-2 text-red-500" />
              Order ID:{" "}
              <span className="font-medium ml-1">{order.orderId}</span>
            </p>
            <p className="flex items-center text-gray-700">
              <FiClock className="mr-2 text-red-500" />
              {format(new Date(order.createdAt), "PPpp")}
            </p>
            <div className="mt-3 p-2 bg-red-50 rounded">
              <p className="text-red-700 text-sm font-medium">
                {order.tamperingType}
              </p>
             <p className="text-red-700 text-sm font-medium">
                {order.additionalInfo}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderSuspiciousLogins = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {activities.suspiciousLogins.map((login) => (
        <div
          key={login._id}
          className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-yellow-500 hover:shadow-xl transition-shadow duration-200"
        >
          <div className="flex items-center mb-4">
            <FiAlertTriangle className="text-yellow-500 text-xl mr-2" />
            <h3 className="text-lg text-gray-600 font-semibold">
              Suspicious Login
            </h3>
          </div>
          <div className="space-y-2">
            <p className="flex items-center text-gray-700">
              <FiUser className="mr-2 text-yellow-500" />
              {login.userName}
            </p>
            <p className="flex items-center text-gray-700">
              <FiMapPin className="mr-2 text-yellow-500" />
              {login.city}, {login.country}
            </p>
            <p className="flex items-center text-gray-700">
              <FiClock className="mr-2 text-yellow-500" />
              {format(new Date(login.loginTime), "PPpp")}
            </p>
            <div className="mt-3 p-2 bg-yellow-50 rounded">
              <p className="text-yellow-700 text-sm font-medium">
                {login.tamperingType}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderLoginDetails = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {activities.recentLoginDetails.map((detail) => (
        <div
          key={detail._id}
          className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition-shadow duration-200"
        >
          <div className="flex items-center mb-4">
            <FiUser className="text-blue-500 text-xl mr-2" />
            <h3 className="text-lg text-gray-600 font-semibold">Login Detail</h3>
          </div>
          <div className="space-y-2">
            <p className="flex items-center text-gray-700">
              <FiUser className="mr-2 text-blue-500" />
              {detail.username}
            </p>
            <p className="flex items-center text-gray-700">
              <FiMapPin className="mr-2 text-blue-500" />
              {detail.city}, {detail.countryName}
            </p>
            <p className="flex items-center text-gray-700">
              <FiClock className="mr-2 text-blue-500" />
              {format(new Date(detail.loginTime), "PPpp")}
            </p>
            <div
              className={`mt-3 p-2 rounded ${
                detail.status === "success" ? "bg-green-50" : "bg-red-50"
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  detail.status === "success"
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                Status:{" "}
                {detail.status.charAt(0).toUpperCase() + detail.status.slice(1)}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
       <button
        onClick={() => navigate("/users/statics")}
        className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <X className="h-6 w-6 text-gray-500" />
      </button>
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Suspicious Activities Dashboard
          </h1>
          <p className="text-gray-600">
            Monitor and track unusual activities across your platform
          </p>
        </div>

        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-lg">
            <nav className="flex space-x-8 p-4">
              {["orders", "logins", "details"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`${
                    activeTab === tab
                      ? "text-blue-600 border-b-2 border-blue-500"
                      : "text-gray-500 hover:text-gray-700"
                  } px-4 py-2 font-medium text-sm rounded-md transition-colors duration-200`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="mb-8">
          {activeTab === "orders" && renderSuspiciousOrders()}
          {activeTab === "logins" && renderSuspiciousLogins()}
          {activeTab === "details" && renderLoginDetails()}
        </div>

        <div className="flex justify-center mt-6">
          <nav className="bg-white px-4 py-3 rounded-lg shadow-lg">
            <div className="flex items-center space-x-4">
              <button
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-gray-600">Page {currentPage}</span>
              <button
                disabled={
                  currentPage >=
                  Math.ceil(
                    activities.pagination.totalOrders /
                      activities.pagination.limit
                  )
                }
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default SuspiciousActivities;
