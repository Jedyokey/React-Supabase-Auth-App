import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { useTheme } from "../ThemeContext";
import DashboardHeader from "../components/DashboardHeader";
import PostSkeleton from "../components/PostSkeleton"; 

const CreatePost = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuth();
  const navigate = useNavigate();

  const { theme } = useTheme();
  const [clientId, setClientId] = useState(null);
  const [allPosts, setAllPosts] = useState([]); 
  const [comments, setComments] = useState({});
  const [loadingPosts, setLoadingPosts] = useState(true); 

  useEffect(() => {
    const loadClient = async () => {
        if (!user) return;
        
        const { data, error } = await supabase
        .from("clients")
        .select("id")
        .eq("user_id", user.id)
        .single();

        if (!error && data) {
        setClientId(data.id);
        }
    };

    loadClient();
  }, [user]);

  // Fetch profile for a post
  const fetchPostWithProfile = async (postData) => {
    try {
      // First, get the client info for this post
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, user_id, email")
        .eq("id", postData.client_id)
        .maybeSingle();

      if (clientError) {
        console.warn("Client fetch error for post:", clientError);
        return { ...postData, client: null, profile: null };
      }

      // Get the profile using the user_id from client
      if (client?.user_id) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("avatar_url, full_name")
          .eq("id", client.user_id)
          .maybeSingle();

        if (profileError) {
          console.warn("Profile fetch error for post:", profileError);
        }

        return {
          ...postData,
          client: client || null,
          profile: profile || null
        };
      }

      return { ...postData, client: client || null, profile: null };
    } catch (err) {
      console.error("Error fetching post profile:", err);
      return { ...postData, client: null, profile: null };
    }
  };

  // Load ALL posts from Supabase on component mount WITH PROFILES
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoadingPosts(true); 
        
        const { data: postsData, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (postsData) {
          // Enrich each post with client and profile info
          const enrichedPosts = await Promise.all(
            postsData.map(async (post) => {
              return await fetchPostWithProfile(post);
            })
          );
          setAllPosts(enrichedPosts);
        }
      } catch (error) {
        console.error('Error fetching posts:', error);
      } finally {
        setLoadingPosts(false); 
      }
    };

    // Only load if we have a user
    if (user) {
        loadPosts();
    }
  }, []); 

  // Enhanced Real-time subscription for ALL posts WITH PROFILE ENRICHMENT
  useEffect(() => { 
    if (!user) return; 
    
    const subscription = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts'
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Enrich the new post with profile data
            const enrichedPost = await fetchPostWithProfile(payload.new);
            setAllPosts(prev => [enrichedPost, ...prev]);
          }
          else if (payload.eventType === 'UPDATE') {
            // Enrich the updated post with profile data
            const enrichedPost = await fetchPostWithProfile(payload.new);
            setAllPosts(prev =>
              prev.map(p => p.id === payload.new.id ? enrichedPost : p)
            );
          }
          else if (payload.eventType === 'DELETE') {
            setAllPosts(prev => prev.filter(p => p.id !== payload.old.id));
            // Also remove comments for deleted post
            setComments(prev => {
              const newComments = { ...prev };
              delete newComments[payload.old.id];
              return newComments;
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!title.trim() || !description.trim()) {
      setError('Title and description are required');
      setLoading(false);
      return;
    }

    // Add this safety check:
    if (!clientId) {
        setError('Unable to verify your account. Please try again.');
        setLoading(false);
        return;
    }

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([
          {
            title: title.trim(),
            description: description.trim(),
            client_id: clientId
          }
        ])
        .select();

      if (error) throw error;
      
      // Show success message
      setSuccess('Your post has been created successfully!');
      
      // Clear form
      setTitle('');
      setDescription('');
      
    } catch (error) {
      console.error('Error creating post:', error);
      setError(error.message || 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-close success messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Auto-close error messages  
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Update a post (only for user's own posts)
  const handleUpdatePost = async (postId, newTitle, newDescription) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .update({
          title: newTitle,
          description: newDescription
        })
        .eq('id', postId)
        .select();

      if (error) throw error;

      setSuccess('Post updated successfully!');
    } catch (error) {
      console.error('Error updating post:', error);
      setError('Failed to update post. Please try again.');
    }
  };

  // Delete a post (only for user's own posts)
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setSuccess('Post deleted successfully!');
    } catch (error) {
      console.error('Error deleting post:', error);
      setError('Failed to delete post. Please try again.');
    }
  };

  // Fetch comments for a post (KEEPING YOUR ORIGINAL FUNCTION)
  const fetchComments = async (postId) => {
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*, clients(id, email, user_id)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Append profiles
      const commentsWithProfiles = await Promise.all(
        (data || []).map(async (comment) => {
          try {
            // Extract user_id correctly (clients is returned as an array)
            const clientUserId = Array.isArray(comment.clients)
              ? comment.clients[0]?.user_id
              : comment.clients?.user_id;

            if (!clientUserId) {
              console.warn(
                "❗ No user_id found inside clients relationship for comment:",
                comment.id
              );
              return { ...comment, profile: null };
            }

            // Fetch the profile using maybeSingle() to avoid PGRST116
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("avatar_url, full_name")
              .eq("id", clientUserId)
              .maybeSingle();

            if (profileError) {
              console.warn(`❗ Profile fetch error for ${clientUserId}`, profileError);
            }

            return {
              ...comment,
              // normalize clients to object (if array, take first item)
              clients: Array.isArray(comment.clients) ? comment.clients[0] : comment.clients || {},
              profile: profile || null,
            };
          } catch (err) {
            console.warn("❗ Unexpected profile fetch error:", err);
            return { ...comment, profile: null };
          }
        })
      );

      return commentsWithProfiles;
    } catch (err) {
      console.error("Error fetching comments:", err);
      return [];
    }
  };

  // Add a new comment 
  const handleAddComment = async (postId, content) => {
    if (!content.trim()) return;

    try {
      // insert
      const { data, error } = await supabase
        .from("comments")
        .insert([
          {
            post_id: postId,
            content: content.trim(),
            client_id: clientId
          }
        ])
        .select();

      if (error) throw error;

      const newComment = data?.[0];
      if (!newComment) return null;

      // fetch client + profile for the new comment (same enrichment as realtime)
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .select("id, email, user_id")
        .eq("id", newComment.client_id)
        .maybeSingle();

      if (clientError) console.warn("Client fetch error (add comment):", clientError);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("avatar_url, full_name")
        .eq("id", client?.user_id)
        .maybeSingle();

      if (profileError) console.warn("Profile fetch error (add comment):", profileError);

      const enriched = {
        ...newComment,
        clients: client || { id: newComment.client_id, email: "" },
        profile: profile || null,
      };

      setComments((prev) => {
        const existingForPost = prev[postId] || [];
        if (existingForPost.some((c) => c.id === enriched.id)) {
          return prev;
        }
        return { ...prev, [postId]: [...existingForPost, enriched] };
      });

      return enriched;
    } catch (err) {
      console.error("Error adding comment:", err);
      throw err;
    }
  };

  // Load comments for all posts on mount
  useEffect(() => {
    const loadAllComments = async () => {
      const commentsMap = {};
      for (const post of allPosts) {
        const postComments = await fetchComments(post.id);
        commentsMap[post.id] = postComments;
      }
      setComments(commentsMap);
    };
    
    if (allPosts.length > 0) {
      loadAllComments();
    }
  }, [allPosts]);

  // Real-time subscription for comments 
  useEffect(() => {
    const subscription = supabase
      .channel("comments-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
        },
        async (payload) => {
          // INSERT (only)
          if (payload.eventType === "INSERT") {
            try {
              // fetch the client record for this comment
              const { data: client, error: clientError } = await supabase
                .from("clients")
                .select("id, email, user_id")
                .eq("id", payload.new.client_id)
                .maybeSingle();

              if (clientError) {
                console.warn("Client fetch error:", clientError);
              }

              // fetch profile by auth user id 
              const userId = client?.user_id;
              const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("avatar_url, full_name")
                .eq("id", userId)
                .maybeSingle();

              if (profileError) {
                console.warn("Profile fetch error:", profileError);
              }

              // Build the normalized comment object
              const commentWithData = {
                ...payload.new,
                clients: client || { id: payload.new.client_id, email: "" },
                profile: profile || null,
              };

              setComments((prev) => {
                const postId = payload.new.post_id;
                const existingForPost = prev[postId] || [];

                // Prevent duplicates
                if (existingForPost.some((c) => c.id === commentWithData.id)) {
                  return prev;
                }

                return {
                  ...prev,
                  [postId]: [...existingForPost, commentWithData],
                };
              });
            } catch (err) {
              console.error("Realtime handler error:", err);
            }
          }

          // DELETE
          else if (payload.eventType === "DELETE") {
            setComments((prev) => ({
              ...prev,
              [payload.old.post_id]: (prev[payload.old.post_id] || []).filter(
                (c) => c.id !== payload.old.id
              ),
            }));
          }

          // UPDATE
          else if (payload.eventType === "UPDATE") {
            setComments((prev) => {
              const postId = payload.new.post_id;
              const arr = prev[postId] || [];
              const idx = arr.findIndex((c) => c.id === payload.new.id);
              if (idx === -1) return prev;
              const updated = [...arr];
              updated[idx] = { ...updated[idx], ...payload.new };
              return { ...prev, [postId]: updated };
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-200">
      <DashboardHeader title="Create Post" />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Create Post Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-200 mb-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              Create New Post
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Fill in the details for your new post
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg flex justify-between items-center">
              <span>{success}</span>
              <button 
                onClick={() => setSuccess('')}
                className="text-green-700 hover:text-green-900 font-bold cursor-pointer"
                aria-label="Close"
              >
                <svg 
                    className="w-6 h-6" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M6 18L18 6M6 6l12 12"
                    />
                </svg>
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg flex justify-between items-center">
              <span>{error}</span>
              <button 
                onClick={() => setError('')}
                className="text-red-700 hover:text-red-900 font-bold cursor-pointer"
                aria-label="Close"
              >
                <svg 
                    className="w-6 h-6" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                >
                    <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M6 18L18 6M6 6l12 12"
                    />
                </svg>
              </button> 
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
              placeholder="Enter post title"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
              placeholder="Enter post description"
              required
            />
          </div>
          
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all duration-200 cursor-pointer font-medium"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create Post'
              )}
            </button>
            
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all duration-200 cursor-pointer font-medium"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Recent Posts Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              Recent Posts {!loadingPosts && `(${allPosts.length} total)`}
            </h3>
            {!loadingPosts && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Your posts: {allPosts.filter(post => post.client_id === clientId).length}
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            {loadingPosts ? (
              // Show 2 skeleton posts while loading
              Array.from({ length: 2 }).map((_, index) => (
                <PostSkeleton key={`skeleton-${index}`} />
              ))
            ) : (
              // Show actual posts when loaded
              allPosts.map((post) => {
                const isUserPost = post.client_id === clientId;
                return (
                  <PostItem 
                    key={post.id} 
                    post={post} 
                    onUpdate={isUserPost ? handleUpdatePost : null}
                    onDelete={isUserPost ? handleDeletePost : null}
                    comments={comments[post.id] || []}
                    onAddComment={handleAddComment}
                    currentUser={user}
                    isUserPost={isUserPost}
                  />
                );
              })
            )}
          </div>
          
          {!loadingPosts && allPosts.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">
              No posts yet. Be the first to create one!
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

// Updated PostItem component WITH POST AUTHOR INFO
const PostItem = ({ post, onUpdate, onDelete, comments = [], onAddComment, currentUser, isUserPost }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editDescription, setEditDescription] = useState(post.description);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    await onUpdate(post.id, editTitle, editDescription);
    setLoading(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(post.title);
    setEditDescription(post.description);
    setIsEditing(false);
  };

  const handleAddCommentClick = async () => {
    if (!commentText.trim()) return;
    
    setAddingComment(true);
    try {
      await onAddComment(post.id, commentText);
      setCommentText('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setAddingComment(false);
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
      {isEditing ? (
        <div className="space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition cursor-pointer text-sm"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition cursor-pointer text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* POST AUTHOR INFO - NEW SECTION */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
              {post.profile?.avatar_url ? (
                <img 
                  src={post.profile.avatar_url} 
                  alt="Author Avatar" 
                  className="w-full h-full object-cover"
                />
              ) : (
                post.profile?.full_name?.charAt(0).toUpperCase() || 
                post.client?.email?.charAt(0).toUpperCase() || 
                "A"
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-800 dark:text-white text-sm">
                  {post.profile?.full_name || post.client?.email || "Anonymous User"}
                </span>
                {isUserPost && (
                  <span className="text-xs px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded">
                    You
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {post.created_at ? new Date(post.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'Recently'}
              </p>
            </div>
          </div>

          <h4 className="font-semibold text-gray-800 dark:text-white mb-2 text-lg">
            {post.title}
          </h4>
          <p className="text-gray-600 dark:text-gray-300 mb-3 whitespace-pre-wrap">
            {post.description}
          </p>
          
          {/* Comment Section */}
          <div className="mt-4 border-t border-gray-200 dark:border-gray-600 pt-3">
            {/* Comment Toggle */}
            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-3"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
            </button>

            {/* Add Comment Input - AVAILABLE FOR ALL POSTS */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
                onKeyPress={(e) => e.key === 'Enter' && handleAddCommentClick()}
              />
              <button
                onClick={handleAddCommentClick}
                disabled={addingComment || !commentText.trim()}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer text-sm"
              >
                {addingComment ? '...' : 'Post'}
              </button>
            </div>

            {/* Comments List */}
            {showComments && comments.length > 0 && (
              <div className="space-y-3 mt-3">
                {comments.map((comment) => {
                  return (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold overflow-hidden"> 
                        {comment.profile?.avatar_url ? (
                          <img 
                            src={comment.profile.avatar_url} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          comment.profile?.full_name?.charAt(0).toUpperCase() || 
                          (Array.isArray(comment.clients) ? comment.clients[0]?.email?.charAt(0).toUpperCase() : comment.clients?.email?.charAt(0).toUpperCase()) || "U"
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                          <p className="text-gray-800 dark:text-gray-200 text-sm">{comment.content}</p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {comment.profile?.full_name ||
                            (Array.isArray(comment.clients) ? comment.clients[0]?.email : comment.clients?.email)} • {new Date(comment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Post Actions (only for user's own posts) */}
          {isUserPost && onUpdate && onDelete && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer text-sm"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(post.id)}
                className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition cursor-pointer text-sm"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CreatePost;