import api from "@/api/axios";

const getStats = async (endpoint, days) => {
    const response = await api.get(`/admin/stats/${endpoint}`, {
        params: { days },
    });
    return response.data;
};

export const getSummary = (days = 30) => getStats("summary", days);
export const getSales = (days = 30) => getStats("sales", days);
export const getOrdersByStatus = (days = 30) =>
    getStats("orders-by-status", days);
export const getPaymentMethods = (days = 30) =>
    getStats("payment-methods", days);
export const getPaymentStatus = (days = 30) =>
    getStats("payment-status", days);
export const getTopProducts = (days = 30) => getStats("top-products", days);
export const getSalesByCategory = (days = 30) =>
    getStats("sales-by-category", days);
export const getSalesByCity = (days = 30) => getStats("sales-by-city", days);
export const getNewCustomers = (days = 30) =>
    getStats("new-customers", days);
export const getRatings = (days = 30) => getStats("ratings", days);
export const getOrdersHeatmap = (days = 30) =>
    getStats("orders-heatmap", days);

export const dashboardStats = {
    summary: getSummary,
    sales: getSales,
    ordersByStatus: getOrdersByStatus,
    paymentMethods: getPaymentMethods,
    paymentStatus: getPaymentStatus,
    topProducts: getTopProducts,
    salesByCategory: getSalesByCategory,
    salesByCity: getSalesByCity,
    newCustomers: getNewCustomers,
    ratings: getRatings,
    ordersHeatmap: getOrdersHeatmap,
};
