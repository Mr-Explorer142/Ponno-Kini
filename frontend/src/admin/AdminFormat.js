export const formatPrice = (value) =>
    `৳${new Intl.NumberFormat("en-BD").format(Number(value) || 0)}`;

export const formatDate = (value) =>
    value
        ? new Date(value).toLocaleString("en-BD", {
              dateStyle: "medium",
              timeStyle: "short",
          })
        : "—";
