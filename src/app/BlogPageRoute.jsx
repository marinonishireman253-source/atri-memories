import { useBlogPageModel } from './useBlogPageModel.js';
import { BlogList } from '../features/blog/BlogList.jsx';
import { BlogDetail } from '../features/blog/BlogDetail.jsx';
import { BlogComments } from '../features/blog/BlogComments.jsx';
import '../features/blog/blog.css';

export function BlogPageRoute(props) {
  // Merge route props (contains user, isAdmin)
  const model = useBlogPageModel(props);
  const {
    posts,
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
    setEditorOpen,
    setEditingPost,
    deletePost,
  } = model;

  // Render detail view if a post is selected
  if (selectedPost) {
    return (
      <div className="blog-route-container">
        <BlogDetail
          post={selectedPost}
          onBack={() => selectPost(null)}
          isAdmin={props.isAdmin}
          onEdit={() => {
            setEditingPost(selectedPost);
            setEditorOpen(true);
          }}
          onDelete={() => deletePost(selectedPost.id)}
        />
        <BlogComments
          comments={comments}
          loading={loadingComments}
          error={commentError}
          onAddComment={addComment}
        />
      </div>
    );
  }

  // Otherwise, render list view
  return (
    <div className="blog-route-container">
      <BlogList
        posts={posts}
        loading={loading}
        error={error}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTag={activeTag}
        onTagChange={setActiveTag}
        allTags={allTags}
        onSelectPost={selectPost}
        isAdmin={props.isAdmin}
        onWriteNewPost={() => {
          setEditingPost(null);
          setEditorOpen(true);
        }}
      />
    </div>
  );
}
