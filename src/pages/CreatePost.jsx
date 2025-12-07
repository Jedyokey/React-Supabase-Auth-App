import React, { useState, useEffect, useCallback } from 'react';
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
  const [expandedComments, setExpandedComments] = useState({});

  // Load client ID
  const loadClient = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!error && data) {
      setClientId(data.id);
    }
  }, [user]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  // Batch fetch ALL profiles (posts + comments)
  const batchFetchAllProfiles = async (postsData, allCommentsData = []) => {
    try {
      // Collect ALL unique client IDs from posts AND comments
      const postClientIds = postsData.map(post => post.client_id).filter(Boolean);
      const commentClientIds = allCommentsData.map(comment => comment.client_id).filter(Boolean);
      const allClientIds = [...new Set([...postClientIds, ...commentClientIds])];
      
      if (allClientIds.length === 0) {
        return {
          enrichedPosts: postsData.map(post => ({ ...post, client: null, profile: null })),
          profilesMap: {}
        };
      }

      // Fetch ALL clients in one query
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select("id, user_id, email")
        .in("id", allClientIds);

      if (clientsError) {
        console.warn("Batch clients fetch error:", clientsError);
        return {
          enrichedPosts: postsData.map(post => ({ ...post, client: null, profile: null })),
          profilesMap: {}
        };
      }

      // Get ALL unique user IDs from clients
      const userIds = [...new Set(clients.map(client => client.user_id).filter(Boolean))];
      
      let profilesMap = {};
      if (userIds.length > 0) {
        // Fetch ALL profiles in one query
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, avatar_url, full_name")
          .in("id", userIds);

        if (!profilesError && profiles) {
          profiles.forEach(profile => {
            profilesMap[profile.id] = profile;
          });
        }
      }

      // Map data back to posts
      const enrichedPosts = postsData.map(post => {
        const client = clients.find(c => c.id === post.client_id);
        const profile = client ? profilesMap[client.user_id] : null;
        
        return {
          ...post,
          client: client || null,
          profile: profile || null
        };
      });

      return { enrichedPosts, profilesMap, clients };
    } catch (err) {
      console.error("Batch fetch error:", err);
      return {
        enrichedPosts: postsData.map(post => ({ ...post, client: null, profile: null })),
        profilesMap: {},
        clients: []
      };
    }
  };

  // Fetch ALL comments for ALL posts efficiently
  const fetchAllComments = useCallback(async () => {
    try {
      // Fetch ALL comments in one query
      const { data: allComments, error } = await supabase
        .from("comments")
        .select("*, clients(id, email, user_id)")
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group comments by post_id
      const commentsByPost = {};
      allComments?.forEach(comment => {
        if (!commentsByPost[comment.post_id]) {
          commentsByPost[comment.post_id] = [];
        }
        commentsByPost[comment.post_id].push(comment);
      });

      return commentsByPost;
    } catch (err) {
      console.error("Error fetching all comments:", err);
      return {};
    }
  }, []);

  // Load ALL posts and comments efficiently
  const loadPostsAndComments = useCallback(async () => {
    try {
      setLoadingPosts(true);
      
      // Fetch all posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (postsError) throw postsError;
      
      if (!postsData || postsData.length === 0) {
        setAllPosts([]);
        setComments({});
        setLoadingPosts(false);
        return;
      }

      // Fetch all comments in parallel
      const commentsByPost = await fetchAllComments();

      // Get all unique comments for batch processing
      const allComments = Object.values(commentsByPost).flat();
      
      // Batch fetch ALL profiles (posts + comments)
      const { enrichedPosts, profilesMap, clients } = await batchFetchAllProfiles(postsData, allComments);
      
      setAllPosts(enrichedPosts);

      // Enrich all comments with profiles
      const enrichedCommentsByPost = {};
      Object.entries(commentsByPost).forEach(([postId, postComments]) => {
        enrichedCommentsByPost[postId] = postComments.map(comment => {
          const client = clients.find(c => c.id === comment.client_id);
          const profile = client ? profilesMap[client.user_id] : null;
          
          return {
            ...comment,
            clients: client || { id: comment.client_id, email: "" },
            profile: profile || null,
          };
        });
      });

      setComments(enrichedCommentsByPost);

    } catch (error) {
      console.error('Error fetching posts and comments:', error);
    } finally {
      setLoadingPosts(false);
    }
  }, [fetchAllComments]);

  useEffect(() => {
    if (user) {
      loadPostsAndComments();
    }
  }, [user, loadPostsAndComments]);

  // Consolidated real-time subscription
  useEffect(() => {
    if (!user) return;
    
    // Posts subscription
    const postsChannel = supabase
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
            // Enrich new post and update
            const { enrichedPosts } = await batchFetchAllProfiles([payload.new]);
            if (enrichedPosts[0]) {
              setAllPosts(prev => [enrichedPosts[0], ...prev]);
              // Initialize empty comments array for new post
              setComments(prev => ({
                ...prev,
                [payload.new.id]: []
              }));
            }
          }
          else if (payload.eventType === 'UPDATE') {
            const { enrichedPosts } = await batchFetchAllProfiles([payload.new]);
            if (enrichedPosts[0]) {
              setAllPosts(prev =>
                prev.map(p => p.id === payload.new.id ? enrichedPosts[0] : p)
              );
            }
          }
          else if (payload.eventType === 'DELETE') {
            setAllPosts(prev => prev.filter(p => p.id !== payload.old.id));
            setComments(prev => {
              const newComments = { ...prev };
              delete newComments[payload.old.id];
              return newComments;
            });
          }
        }
      )
      .subscribe();

    // Comments subscription - handles ALL comment changes
    const commentsChannel = supabase
      .channel("comments-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            // Enrich the new comment
            const { enrichedPosts, profilesMap, clients } = await batchFetchAllProfiles([], [payload.new]);
            const client = clients.find(c => c.id === payload.new.client_id);
            const profile = client ? profilesMap[client.user_id] : null;
            
            const enrichedComment = {
              ...payload.new,
              clients: client || { id: payload.new.client_id, email: "" },
              profile: profile || null,
            };

            setComments(prev => {
              const postId = payload.new.post_id;
              const existing = prev[postId] || [];
              // Prevent duplicates
              if (existing.some(c => c.id === payload.new.id)) return prev;
              return {
                ...prev,
                [postId]: [...existing, enrichedComment]
              };
            });
          }
          else if (payload.eventType === "DELETE") {
            setComments(prev => ({
              ...prev,
              [payload.old.post_id]: (prev[payload.old.post_id] || []).filter(
                c => c.id !== payload.old.id
              ),
            }));
          }
          else if (payload.eventType === "UPDATE") {
            setComments(prev => {
              const postId = payload.new.post_id;
              const arr = prev[postId] || [];
              const idx = arr.findIndex(c => c.id === payload.new.id);
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
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(commentsChannel);
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
      
      setSuccess('Your post has been created successfully!');
      setTitle('');
      setDescription('');
      
    } catch (error) {
      console.error('Error creating post:', error);
      setError(error.message || 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-close success & error messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 7000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Update a post
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

  // Delete a post
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

  // Add comment
  const handleAddComment = useCallback(async (postId, content) => {
    if (!content.trim() || !clientId) return;

    try {
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
      return data?.[0];
    } catch (err) {
      console.error("Error adding comment:", err);
      throw err;
    }
  }, [clientId]);

  // Toggle comments visibility
  const toggleComments = useCallback((postId) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-200">
      <DashboardHeader title="Create Post" />

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
              Array.from({ length: 2 }).map((_, index) => (
                <PostSkeleton key={`skeleton-${index}`} />
              ))
            ) : (
              allPosts.map((post) => {
                const isUserPost = post.client_id === clientId;
                const postComments = comments[post.id] || [];
                
                return (
                  <PostItem 
                    key={post.id} 
                    post={post} 
                    onUpdate={isUserPost ? handleUpdatePost : null}
                    onDelete={isUserPost ? handleDeletePost : null}
                    comments={postComments}
                    onAddComment={handleAddComment}
                    currentUser={user}
                    isUserPost={isUserPost}
                    isCommentsExpanded={!!expandedComments[post.id]}
                    onToggleComments={() => toggleComments(post.id)}
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

// PostItem component 
const PostItem = ({ 
  post, 
  onUpdate, 
  onDelete, 
  comments = [], 
  onAddComment, 
  currentUser, 
  isUserPost,
  isCommentsExpanded,
  onToggleComments 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editDescription, setEditDescription] = useState(post.description);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

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

  const formattedDate = post.created_at ? new Date(post.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : 'Recently';

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
          {/* POST AUTHOR INFO */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold overflow-hidden">
              {post.profile?.avatar_url ? (
                <>
                  {!imageLoaded && (
                    <div className="absolute w-8 h-8 bg-gray-300 dark:bg-gray-600 animate-pulse rounded-full" />
                  )}
                  <img 
                    src={post.profile.avatar_url} 
                    alt="Author Avatar" 
                    className={`w-full h-full object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                    loading="lazy"
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageLoaded(true)}
                  />
                </>
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
                {formattedDate}
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
              onClick={onToggleComments}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-3 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
            </button>

            {/* Add Comment Input */}
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

            {/* Comments List - Only shown when expanded */}
            {isCommentsExpanded && comments.length > 0 && (
              <div className="space-y-3 mt-3">
                {comments.map((comment) => {
                  // Format comment date
                  const commentDate = comment.created_at ? new Date(comment.created_at).toLocaleDateString() : '';
                  return (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold overflow-hidden flex-shrink-0">
                        {comment.profile?.avatar_url ? (
                          <img 
                            src={comment.profile.avatar_url} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                            loading="lazy"
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
                            (Array.isArray(comment.clients) ? comment.clients[0]?.email : comment.clients?.email)} • {commentDate}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Post Actions */}
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