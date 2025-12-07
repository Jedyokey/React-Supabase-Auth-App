import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthContext";
import { useTheme } from "../ThemeContext";
import DashboardHeader from "../components/DashboardHeader";

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState({
    full_name: "",
    avatar_url: ""
  });
  const [notifications, setNotifications] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false); // Track image load state
  const imageCache = useRef(new Map()); // Simple cache

  // Load user profile and preferences
    useEffect(() => {
        let isActive = true;

        const loadUserProfile = async () => {
            if (!user || !isActive) return;
            
            const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

            if (isActive && !error && data) {
              setProfile({
                  full_name: data.full_name || "",
                  avatar_url: data.avatar_url || ""
              });
              setImageLoaded(false); // Reset image load state when URL changes
            }
        };

        // Set notifications 
        const savedNotifications = localStorage.getItem('notifications') !== 'false';
        setNotifications(savedNotifications);
        
        // Load profile
        loadUserProfile();

        return () => {
            isActive = false;
        };
    }, [user]);

    // Preload avatar image
    useEffect(() => {
      if (!profile.avatar_url) return;
      
      // Check cache first
      if (imageCache.current.has(profile.avatar_url)) {
        setImageLoaded(true);
        return;
      }

      // Preload image
      const img = new Image();
      img.src = profile.avatar_url;
      
      img.onload = () => {
        setImageLoaded(true);
        imageCache.current.set(profile.avatar_url, true); // Cache it
      };
      
      img.onerror = () => {
        setImageLoaded(true); // Still set to true to show fallback
      };
    }, [profile.avatar_url]);

  // Handle avatar upload
  const handleAvatarUpload = async (event) => {
      try {
          setUploading(true);
          const file = event.target.files[0];
          if (!file) return;

          // Validate file size (max 2MB)
          if (file.size > 2 * 1024 * 1024) {
            alert("Image size should be less than 2MB");
            return;
          }

          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}.${fileExt}`;
          const filePath = `profile/${user.id}/${fileName}`;

          // Upload
          const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true });

          if (uploadError) throw uploadError;

          // Get PUBLIC URL of the uploaded file
          const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

          // Clear cache for this URL
          imageCache.current.delete(profile.avatar_url);

          // Save avatar URL
          const { error: updateError } = await supabase
          .from('profiles')
          .upsert({
              id: user.id,
              avatar_url: publicUrl, // Store public URL
              updated_at: new Date().toISOString()
          });

          if (updateError) throw updateError;

          setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
          setImageLoaded(false); // Reset for new image
          alert("Profile picture updated successfully!");

      } catch (error) {
          console.error("Error uploading avatar:", error);
          alert("Error uploading profile picture");
      } finally {
          setUploading(false);
      }
   };

  const saveProfile = async () => {
    try {
      setSaving(true);
      
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: profile.full_name,
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error("Supabase error details:", error);
        throw error;
      }

      localStorage.setItem('notifications', notifications);
      alert("Settings saved successfully!");
      
    } catch (error) {
      console.error("Error saving profile:", error);
      alert(`Error saving settings: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-200">
      <DashboardHeader title="Settings" />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-200">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Account Settings</h2>

          {/* Profile Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Profile Information</h3>
            
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden mb-3">
                  {profile.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onLoad={() => setImageLoaded(true)}
                      onError={() => setImageLoaded(true)}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <span className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium">
                    {uploading ? "Uploading..." : "Change Photo"}
                  </span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Max 2MB</p>
              </div>

              {/* Profile Form */}
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={profile.full_name}
                    onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Preferences</h3>
            
            <div className="space-y-4">
             
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-medium text-gray-800 dark:text-white">Dark Mode</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                    Current: {theme} {/* light or dark */}
                    </p>
                </div>
                <button
                    onClick={() => {
                    toggleTheme();
                    }}
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                    theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                >
                    <div className={`w-4 h-4 rounded-full bg-white transform transition-transform absolute top-1 ${
                    theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
                    }`} />
                </button>
            </div>

              {/* Notifications Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">Email Notifications</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Receive email updates about your orders</p>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    notifications ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transform transition-transform absolute top-1 ${
                    notifications ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}