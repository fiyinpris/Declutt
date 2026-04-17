import React from "react";

const DecluttLogo = ({ className }) => (
  <span className={`text-xl font-black tracking-tight ${className || ""}`}>
    <span className="text-foreground">De</span>
    <span className="text-primary">clutt</span>
  </span>
);

export default DecluttLogo;