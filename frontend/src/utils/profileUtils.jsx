import axios from "axios";

export const checkPaymentStatus = async () => {
  try {
    const response = await axios.get(
      "https://streamify-694k.onrender.com/api/payment/check-payment",
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    return { showPaymentReminder: false };
  }
};
