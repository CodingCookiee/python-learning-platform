The product catalogue needs a thumbnail for every photo. Downloading is I/O-bound and fast;
resizing is slower, and every downloaded image waiting to be resized takes up memory. Write
`thumbnails(urls, download, resize, *, downloaders, resizers, buffer)` as a two-stage pipeline:

- **Stage 1:** `downloaders` worker tasks take URLs and run `await download(url)`, which returns
  the image.
- **Stage 2:** `resizers` worker tasks take downloaded images and run `await resize(image)`, which
  returns the thumbnail.
- The stages are joined by an `asyncio.Queue(maxsize=buffer)`, so resizing starts as soon as the
  first image arrives, and downloaders wait when `buffer` images are already waiting.
- When everything is done, every worker has stopped, and `thumbnails` returns a dict of URL to
  thumbnail, in the order of `urls`.

```python
await thumbnails(photo_urls, download, resize, downloaders=3, resizers=2, buffer=4)
# {"https://cdn.example.com/p/1.jpg": <thumbnail>, "https://cdn.example.com/p/2.jpg": ..., ...}
```

You can assume `download` and `resize` never raise.
