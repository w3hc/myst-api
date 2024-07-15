# File Upload API

## Install

```bash
pnpm i
```

## Run

```bash
pnpm start
```

## Test

```bash
pnpm test
```

End-to-end tests: 

```bash
test:e2e
```

With coverage: 

```bash
pnpm test:cov
```

## Examples

### Upload

#### Curl 

```
curl -X 'POST' \
  'http://localhost:3000/file/upload' \
  -H 'accept: */*' \
  -H 'api-key: 1234' \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@brassens-rue-florimont.jpeg;type=image/jpeg'
```

#### Response body: 

```
{
  "message": "File uploaded successfully",
  "metadata": {
    "filename": "file-1721071831605-103105625.jpeg",
    "originalname": "brassens-rue -florimont (1).jpeg",
    "mimetype": "image/jpeg",
    "size": 134902,
    "uploadDate": "2024-07-15T19:30:31.611Z"
  }
}
```

### Download

```
curl -X 'GET' \
  'http://localhost:3000/file/download/file-1721071831605-103105625.jpeg' \
  -H 'accept: */*' \
  -H 'api-key: 1234'
```

## Versions

- pnpm `v8.7.5`
- node `v20.9.0`

## Support

You can contact me via [Element](https://matrix.to/#/@julienbrg:matrix.org), [Farcaster](https://warpcast.com/julien-), [Telegram](https://t.me/julienbrg), [Twitter](https://twitter.com/julienbrg), [Discord](https://discordapp.com/users/julienbrg), or [LinkedIn](https://www.linkedin.com/in/julienberanger/).