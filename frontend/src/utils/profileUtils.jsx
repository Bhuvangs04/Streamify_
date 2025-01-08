import axios from "axios";

export const checkPaymentStatus = async () => {
  try {
    const response = await axios.get(
      "https://streamify-o1ga.onrender.com/api/payment/check-payment",
      { withCredentials: true }
    );
    return response.data;
  } catch (error) {
    return { showPaymentReminder: false };
  }
};
