-- Storage privacy: images are now served through signed URLs from media-urls.

update storage.buckets
set public = false
where id = 'atri-images';
