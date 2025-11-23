import React, { useState, useEffect } from "react";

const ProfileImageSection = () => {
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    const storedImage = localStorage.getItem("profileImage");
    if (storedImage) setProfileImage(storedImage);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Image = reader.result as string;
      setProfileImage(base64Image);
      localStorage.setItem("profileImage", base64Image);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {profileImage ? (
          <img
            src={profileImage}
            alt="Profile"
            className="w-20 h-20 rounded-full object-cover border"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <span>No Image</span>
          </div>
        )}
        <label className="text-sm font-medium cursor-pointer underline">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          Edit Image
        </label>
      </div>
    </div>
  );
};

export default ProfileImageSection;
