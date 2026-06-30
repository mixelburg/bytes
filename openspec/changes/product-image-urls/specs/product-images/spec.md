## ADDED Requirements

### Requirement: Image field stores a key or an absolute URL

The `image` field on products and variants SHALL hold either a relative storage key for images in the application's own bucket, or an absolute URL (beginning with `http`) for external images. A value beginning with `http` SHALL be treated as external; any other value SHALL be treated as a storage key.

#### Scenario: External URL is recognized
- **WHEN** an `image` value begins with `http`
- **THEN** the system treats it as an external absolute URL and does not prefix it

#### Scenario: Bare key is recognized
- **WHEN** an `image` value does not begin with `http`
- **THEN** the system treats it as a storage key for the application's bucket

### Requirement: API resolves image references to absolute URLs

Every API response that includes a product or variant `image` SHALL return a fully-qualified, directly-loadable URL. Storage keys SHALL be resolved by prefixing the configured public base and bucket; absolute URLs SHALL be returned unchanged. Clients SHALL NOT need to construct image URLs themselves.

#### Scenario: Key is resolved against the configured base
- **WHEN** a stored `image` is the key `abc123.png` and the public base resolves to `https://s3.bstore.kroha.dev/bytes-products`
- **THEN** the API returns `https://s3.bstore.kroha.dev/bytes-products/abc123.png`

#### Scenario: External URL passes through unchanged
- **WHEN** a stored `image` is `https://picsum.photos/seed/bytes-1/400/400`
- **THEN** the API returns that exact URL unchanged

#### Scenario: Resolution applies across all product endpoints
- **WHEN** a product or variant `image` is returned by the product list, the product detail, or any variant payload
- **THEN** the same resolution rule is applied to each

### Requirement: Public base is required configuration

The public base used to resolve storage keys SHALL be supplied by configuration (`S3_PUBLIC_URL` and `S3_BUCKET`). The service SHALL fail to start when this configuration is missing, rather than emit broken image URLs.

#### Scenario: Missing configuration fails fast
- **WHEN** the service starts without `S3_PUBLIC_URL` (or `S3_BUCKET`) set
- **THEN** startup fails with a clear error naming the missing variable

### Requirement: Image upload returns a persistable key

`POST /images` SHALL return both the storage `key` (to be persisted on a product or variant) and the resolved `url` (for immediate display). Persisting the key, rather than the URL, SHALL keep stored data independent of the serving domain.

#### Scenario: Upload response shape
- **WHEN** a client uploads a valid image to `POST /images`
- **THEN** the response contains a `key` storage identifier and a `url` resolving to that key under the configured public base
