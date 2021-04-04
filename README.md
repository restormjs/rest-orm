[![Node.js CI](https://github.com/restormjs/restormjs/actions/workflows/node.js.yml/badge.svg)](https://github.com/restormjs/restormjs/actions/workflows/node.js.yml)
[![CodeQL](https://github.com/restormjs/restormjs/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/restormjs/restormjs/actions/workflows/codeql-analysis.yml)
[![Coverage Status](https://coveralls.io/repos/github/restormjs/restormjs/badge.svg?branch=main)](https://coveralls.io/github/restormjs/restormjs?branch=main)

# restormjs [DRAFT][WIP][BROKEN][WAIT]
A thin, fast, flexible and secure REST service to database objects.

## Problem
Long story short, the longer the more I realize ORM as an engineering concept is a bad antipattern. Why? It makes things messy, very quickly from the start. Unmaintainable, both db and client side. ORM does not hide persistence complexity, just delays the moment of truth. This project is about getting rid of ORM as a concept, once and hopefully forever.
What's left? Think of it as a REST query language to a database, straight and simple.
And how does it help? Because it is honest! It is not going to hide database complexity, but would help organize the project better, every layer in its place by eliminating customizations in the middle. Why is it secure? Because there is no custom code, all endpoints are generally consistent.
Why is it flexible? There are good query capabilities, enhanced with full HTTP support. Consistent and reliable.
And thin? There is no 'business' logic on a server, use it on ui where it belongs. Stateless, simple and fast. That's it.

## Getting Started
A few steps to get the first apis fully up and ready:
1. You'd need to take care of database objects by yourself. Particularly tables and views.
2. Generate api spec. There is no need to scrape db every startup. Metadata file generated once and would do the trick. It provides a good view over what's exposed via REST.
3. Start the server. Use it!

What's more?
This topic will go through a slow evolution process, as I (and hopefully community) would need advancing features.
* Security. Services require access control to apis. Database is the one supposed to take care as the last line of defence, however db can't sustain general traffic. So the service is to the rescue. Spec generators can read database access controls and prevalidate requests like if it was a db, but in a more scalable way, because service is stateless. The validation is consistent since there is no engineer intervention to a generated specification (this is important).
* Monitoring. TBD
* Performance. TBD

## Usage
```
npm install restormjs

# Quick test run, 100% passed
npm test

# Generate API specification (Use your database)
npx restorm-pg-generate --db-conn=postgres://restormjs:restormjs@localhost:5432/restormjs > api-spec.json

# Configure your server
npx restormjs-get-config > config.json

# Edit config.json to set up database connection and optional settings

# TBD override config
npx restormjs-server --config=config.json

# Verify that the server is up and running. This should return api spec json:
curl http://localhost:3002/api
```

## Configuration

## HTTP Queries

## API Specification

## Contributing

### Default limits
# offset, limit
# request payload 

## Roadmap
1. Tests / Comments / Readme
2. CRUD - GET, POST, PUT, PATCH, DELETE, OPTIONS?
3. REST Filters - eq, gt, ge, lt, le, llike, rlike
   2.1 case sensitive, insensitive
   2.2 Pagination (offset, limit)
4. Connection pooling
5. HTTPS, DB SSL
6. Monitoring / Stats
7. Config updates
8. CI,
9. Prod Mode
10. Contrib
11. Performance tests
12. Caches / perf tune
13. Media integration (share news, releases, perf metrics)

----
Separate Project:
1. UI Service generator from spec
2. API Versioning
3. DB object and service - full cycle gen
4. Hot Swap
