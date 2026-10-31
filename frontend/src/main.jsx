import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { LocaleProvider } from "./LocaleProvider";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <LocaleProvider>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </LocaleProvider>
    </StrictMode>,
);
