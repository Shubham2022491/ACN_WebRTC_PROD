import { useState } from "react";

export default function Home(){
    const [meetingUrl, setMeetingUrl] = useState("");

  const createMeeting = () => {
    const meetingId = Math.random().toString(36).substr(2, 9);
    const url = `${window.location.origin}/meet?room_id=${meetingId}`;
    setMeetingUrl(url);
  };


  const headingStyle = {
    fontSize: "1.5rem",
    fontWeight: "bold",
    marginBottom: "24px",
    color: "#1f2937"
  };

  const linkContainerStyle = {
    marginTop: "20px",
    padding: "16px",
    backgroundColor: "#f9fafb",
    borderRadius: "6px",
    border: "1px solid #e5e7eb"
  };

  const linkTextStyle = {
    color: "#2563eb",
    wordBreak: "break-all",
    marginTop: "8px",
    fontWeight: "500"
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      backgroundColor: "#f3f4f6",
      margin: 0,
      padding: 0,
      width: "100%",
      position: "absolute",
      top: 0,
      left: 0
    }}>
      <div 
        style={{
          backgroundColor: "white",
          padding: "32px",
          borderRadius: "8px",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
          width: "400px",
          maxWidth: "90%",
          border: "1px solid #e5e7eb",
          textAlign: "center",
          transition: "box-shadow 0.3s ease, transform 0.2s ease"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.boxShadow = "0 15px 30px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(66, 153, 225, 0.3)";
          e.currentTarget.style.transform = "translateY(-5px)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.boxShadow = "0 10px 25px rgba(0, 0, 0, 0.1)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <h1 style={headingStyle}>Welcome to Meet App</h1>
        
        <button 
        onClick={createMeeting}
        style={{
          backgroundColor: "#3b82f6",
          color: "white",
          padding: "12px 24px",
          borderRadius: "6px",
          width: "100%",
          fontWeight: "500",
          cursor: "pointer",
          border: "none",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          transition: "all 0.2s ease-in-out"
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = "#2563eb";
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.15)";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = "#3b82f6";
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
        }}
      >
        Create New Meeting
      </button>
        
        {meetingUrl && (
          <div style={linkContainerStyle}>
            <p style={{color: "#6b7280", fontSize: "0.875rem", marginBottom: "8px"}}>
              Your meeting link:
            </p>
            <p style={linkTextStyle}>{meetingUrl}</p>
            <button 
            onClick={() => {
              navigator.clipboard.writeText(meetingUrl);
              alert("Link copied to clipboard!");
            }}
            style={{
              marginTop: "12px",
              backgroundColor: "#e5e7eb",
              color: "#4b5563",
              padding: "8px 16px",
              borderRadius: "6px",
              width: "100%",
              fontSize: "0.875rem",
              cursor: "pointer",
              border: "none",
              transition: "background-color 0.2s ease"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#d1d5db";
              e.currentTarget.style.color = "#374151";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "#e5e7eb";
              e.currentTarget.style.color = "#4b5563";
            }}
          >
            Copy Link
          </button>
          </div>
        )}
      </div>
    </div>
  );
}