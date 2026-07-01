import { useState, useEffect, useCallback, useMemo } from 'react';
import { hasSupabaseConfig, supabase } from '../lib/supabaseClient.js';
import { demoBlogPosts, demoBlogComments } from '../data/demoBlogPosts.js';

// Random sticky note colors
const STICKY_COLORS = ['yellow', 'pink', 'blue', 'green'];

function readLocalJson(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocalJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function useBlogPageModel({
  user,
  isAdmin,
  blogEditorOpen,
  setBlogEditorOpen,
  editingBlogPost,
  setEditingBlogPost,
  setBlogEditorSaving,
  setBlogEditorError,
  setBlogEditorSaveCallback,
} = {}) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Detail post
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentError, setCommentError] = useState('');

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState('all');

  // Local fallback editor states
  const [localEditorOpen, setLocalEditorOpen] = useState(false);
  const [localEditingPost, setLocalEditingPost] = useState(null);
  const [savingPost, setSavingPost] = useState(false);
  const [editorError, setEditorError] = useState('');

  // Use shared states if available, otherwise fallback to local
  const editorOpen = blogEditorOpen !== undefined ? blogEditorOpen : localEditorOpen;
  const setEditorOpen = setBlogEditorOpen !== undefined ? setBlogEditorOpen : setLocalEditorOpen;
  const editingPost = editingBlogPost !== undefined ? editingBlogPost : localEditingPost;
  const setEditingPost = setEditingBlogPost !== undefined ? setEditingBlogPost : setLocalEditingPost;

  // Sync state back to homepage model if shared hooks are present
  useEffect(() => {
    if (setBlogEditorSaving) {
      setBlogEditorSaving(savingPost);
    }
  }, [savingPost, setBlogEditorSaving]);

  useEffect(() => {
    if (setBlogEditorError) {
      setBlogEditorError(editorError);
    }
  }, [editorError, setBlogEditorError]);

  // Fallback state for local updates in Demo mode
  const [localPosts, setLocalPosts] = useState(() => readLocalJson('local-blog-posts', demoBlogPosts));

  const [localComments, setLocalComments] = useState(() => {
    return readLocalJson('local-blog-comments', demoBlogComments);
  });


  // Sync local state to localStorage
  const saveLocalPosts = useCallback((newPosts) => {
    setLocalPosts(newPosts);
    saveLocalJson('local-blog-posts', newPosts);
  }, []);

  const saveLocalComments = useCallback((newComments) => {
    setLocalComments(newComments);
    saveLocalJson('local-blog-comments', newComments);
  }, []);

  // Load all posts
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError('');

    if (!hasSupabaseConfig || !supabase) {
      // Demo Mode
      setPosts(localPosts);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      setError(`无法同步博客：${err.message}`);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [localPosts]);

  // Load comments for a single post
  const fetchComments = useCallback(async (postId) => {
    if (!postId) return;
    setLoadingComments(true);
    setCommentError('');

    if (!hasSupabaseConfig || !supabase) {
      // Demo Mode
      const postComments = localComments.filter(c => c.post_id === postId);
      setComments(postComments);
      setLoadingComments(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('blog_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      setCommentError(`无法同步留言：${err.message}`);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, [localComments]);

  // Read post selection from URL search params on load or URL changes
  useEffect(() => {
    const handleUrlChange = () => {
      const params = new URLSearchParams(window.location.search);
      const postId = params.get('post');
      setSelectedPostId(postId);

      const write = params.get('write');
      if (write === 'true' && isAdmin) {
        setEditingPost(null);
        setEditorOpen(true);
        // Clear ?write=true from URL
        const newUrl = postId ? `/blog?post=${postId}` : '/blog';
        window.history.replaceState({}, '', newUrl);
      }
    };

    handleUrlChange();
    window.addEventListener('popstate', handleUrlChange);
    return () => window.removeEventListener('popstate', handleUrlChange);
  }, [isAdmin, setEditingPost, setEditorOpen]);


  // Fetch posts list initially
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Load selected post details and its comments
  useEffect(() => {
    if (selectedPostId) {
      const post = posts.find(p => p.id === selectedPostId);
      if (post) {
        setSelectedPost(post);
        fetchComments(selectedPostId);
      } else if (!loading) {
        // Post not found in list, fallback
        setSelectedPost(null);
      }
    } else {
      setSelectedPost(null);
      setComments([]);
    }
  }, [selectedPostId, posts, loading, fetchComments]);

  // Set post detail route in URL (without breaking routing)
  const selectPost = useCallback((postId) => {
    const nextUrl = postId ? `/blog?post=${postId}` : '/blog';
    window.history.pushState({}, '', nextUrl);
    window.dispatchEvent(new Event('popstate'));
  }, []);

  // Add Comment
  const addComment = useCallback(async ({ authorName, content }) => {
    if (!selectedPostId) return;
    setCommentError('');

    const randomColor = STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];
    const newComment = {
      post_id: selectedPostId,
      author_name: authorName.trim() || '匿名的打捞员',
      content: content.trim(),
      color: randomColor,
      created_at: new Date().toISOString(),
    };

    if (!hasSupabaseConfig || !supabase) {
      // Demo Mode
      const commentWithId = { ...newComment, id: `comment-${Date.now()}` };
      const updatedComments = [...localComments, commentWithId];
      saveLocalComments(updatedComments);
      setComments(prev => [...prev, commentWithId]);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('submit-blog-comment', {
        body: newComment,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setComments(prev => [...prev, data.comment]);
    } catch (err) {
      const message = err?.message?.includes('rate')
        ? '留言太频繁了，请稍后再试。'
        : '留言提交失败，请稍后重试。';
      setCommentError(message);
      throw new Error(message);
    }
  }, [localComments, saveLocalComments, selectedPostId]);

  // Create or Update Blog Post (Admin Only)
  const savePost = useCallback(async (postData) => {
    if (!isAdmin) {
      setEditorError('只有管理员可发布博客');
      return;
    }
    setSavingPost(true);
    setEditorError('');

    const isEditing = Boolean(editingPost);
    const postRecord = {
      title: postData.title.trim(),
      excerpt: postData.excerpt.trim(),
      content: postData.content.trim(),
      tags: postData.tags || [],
      mood: postData.mood || '☀️',
      is_published: postData.is_published !== false,
      updated_at: new Date().toISOString(),
    };

    if (!isEditing) {
      postRecord.created_at = new Date().toISOString();
    }

    if (!hasSupabaseConfig || !supabase) {
      // Demo Mode
      if (isEditing) {
        const updatedPosts = localPosts.map(p => p.id === editingPost.id ? { ...p, ...postRecord } : p);
        saveLocalPosts(updatedPosts);
        setPosts(updatedPosts);
      } else {
        const newPost = { ...postRecord, id: `blog-${Date.now()}` };
        const updatedPosts = [newPost, ...localPosts];
        saveLocalPosts(updatedPosts);
        setPosts(updatedPosts);
      }
      setEditorOpen(false);
      setEditingPost(null);
      setSavingPost(false);
      window.dispatchEvent(new Event('atri-blog-publish-success'));
      return;
    }

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('blog_posts')
          .update(postRecord)
          .eq('id', editingPost.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert(postRecord);

        if (error) throw error;
      }

      await fetchPosts();
      setEditorOpen(false);
      setEditingPost(null);
      window.dispatchEvent(new Event('atri-blog-publish-success'));
    } catch (err) {
      setEditorError(`博客保存失败：${err.message}`);
    } finally {
      setSavingPost(false);
    }
  }, [editingPost, fetchPosts, isAdmin, localPosts, saveLocalPosts, setEditingPost, setEditorOpen]);

  // Delete Blog Post (Admin Only)
  const deletePost = useCallback(async (postId) => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');

    if (!hasSupabaseConfig || !supabase) {
      // Demo Mode
      const updatedPosts = localPosts.filter(p => p.id !== postId);
      saveLocalPosts(updatedPosts);
      setPosts(updatedPosts);
      const updatedComments = localComments.filter(c => c.post_id !== postId);
      saveLocalComments(updatedComments);

      selectPost(null);
      setLoading(false);
      return;
    }

    try {
      const { error: commentsError } = await supabase
        .from('blog_comments')
        .delete()
        .eq('post_id', postId);
      if (commentsError) throw commentsError;

      const { error: postError } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', postId);

      if (postError) throw postError;
      await fetchPosts();
      selectPost(null);
    } catch (err) {
      setError(`博客删除失败：${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [fetchPosts, isAdmin, localComments, localPosts, saveLocalComments, saveLocalPosts, selectPost]);

  // Extract all tags from posts
  const allTags = useMemo(() => {
    const tags = new Set();
    posts.forEach(post => {
      if (Array.isArray(post.tags)) {
        post.tags.forEach(t => tags.add(t));
      }
    });
    return Array.from(tags);
  }, [posts]);

  // Filter posts by activeTag and Search query
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesTag = activeTag === 'all' || (Array.isArray(post.tags) && post.tags.includes(activeTag));
      const matchesSearch = !searchQuery.trim() ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTag && matchesSearch;
    });
  }, [posts, activeTag, searchQuery]);

  useEffect(() => {
    if (setBlogEditorSaveCallback) {
      setBlogEditorSaveCallback(() => savePost);
    }
  }, [savePost, setBlogEditorSaveCallback]);

  return {
    posts: filteredPosts,
    loading,
    error,
    selectedPost,
    comments,
    loadingComments,
    commentError,
    searchQuery,
    setSearchQuery,
    activeTag,
    setActiveTag,
    allTags,
    selectPost,
    addComment,

    // Admin features
    editorOpen,
    setEditorOpen,
    editingPost,
    setEditingPost,
    savingPost,
    editorError,
    savePost,
    deletePost,
  };
}
