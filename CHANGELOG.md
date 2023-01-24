# 0.2.0-rc.8 - 24 Jan 2022
Fix:
- Add support for Elysia WS which support Elysia 0.2.0-rc.1

# 0.2.0-rc.7 - 24 Jan 2022
Fix:
- Resolve Elysia 0.2.0-rc.1 type

# 0.2.0-rc.6 - 24 Jan 2022
Improvement:
- Set minimum Elysia version to 0.2.0-rc.1

# 0.2.0-rc.5 - 19 Jan 2022
Improvement:
- Handle application/json with custom encoding

# 0.2.0-rc.4 - 19 Jan 2022
Change:
- It's now required to specified specific version to use elysia

# 0.2.0-rc.3 - 7 Jan 2022
Improvement:
- Add `$params` to indicate any string params

Bug fix:
- Sometime Eden doesn't infer returned type

# 0.2.0-rc.2 - 5 Jan 2022
Improvement:
- Auto switch between `ws` and `wss`

# 0.2.0-rc.1 - 4 Jan 2022
Breaking Change:
- Change HTTP verb to lowercase

Feature:
- Support multiple path parameters

Bug fix:
- Required query in `subscribe`
- Make `unknown` type optional
- Add support for non-object fetch

# 0.2.0-rc.0 - 3 Jan 2022
Feature:
- Experimental support for Web Socket

# 0.1.0-rc.6 - 16 Dec 2022
Feature:
- Auto convert number, boolean on client

# 0.1.0-rc.4 - 16 Dec 2022
Feature:
- Using `vite` for bundling

# 0.1.0-rc.3 - 13 Dec 2022
Bug fix:
- Map error to `.catch`

# 0.1.0-rc.2 - 13 Dec 2022
Feature:
- Add camelCase transformation
