import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Navbar } from "./Component/Navbar";
import { Footer } from "./Component/Footer";
import { HomeSection } from "./Component/HomeSection";

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomeSection />} />
      </Routes>
      <Footer />
    </BrowserRouter>
  );
}

export default App;
