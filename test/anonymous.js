'use strict';

const async = require('async');
const path = require('path');
const assert = require('assert');
const validator = require('validator');
const mockdate = require('mockdate');
const nconf = require('nconf');
const request = require('request');
const util = require('util');

const sleep = util.promisify(setTimeout);

const db = require('./mocks/databasemock');
const file = require('../src/file');
const topics = require('../src/topics');
const posts = require('../src/posts');
const categories = require('../src/categories');
const privileges = require('../src/privileges');
const meta = require('../src/meta');
const User = require('../src/user');
const groups = require('../src/groups');
const helpers = require('./helpers');
const socketPosts = require('../src/socket.io/posts');
const socketTopics = require('../src/socket.io/topics');
const apiTopics = require('../src/api/topics');

const requestType = util.promisify((type, url, opts, cb) => {
    request[type](url, opts, (err, res, body) => cb(err, { res: res, body: body }));
});

describe('Topic\'s', () => {
    let topic;
    let categoryObj;
    let adminUid;
    let guestUid;
    let adminJar;
    let csrf_token;
    let fooUid;

    before(async () => {
        adminUid = await User.create({ username: 'admin', password: '123456' });
        guestUid = 0;
        fooUid = await User.create({ username: 'foo' });
        await groups.join('administrators', adminUid);
        const adminLogin = await helpers.loginUser('admin', '123456');
        adminJar = adminLogin.jar;
        csrf_token = adminLogin.csrf_token;

        categoryObj = await categories.create({
            name: 'Test Category',
            description: 'Test category created by testing script',
        });
        topic = {
            userId: adminUid,
            categoryId: categoryObj.cid,
            title: 'Test Topic Title',
            content: 'The content of test topic',
        };
    });

    describe('.anonymous-post', () => {
        it('should create a new anonymous topic with proper parameters', (done) => {
            topics.post({
                uid: topic.userId,
                title: topic.title,
                content: topic.content,
                cid: topic.categoryId,
                anonymous: true,
            }, (err, result) => {
                assert.ifError(err);
                assert(result);
                topic.tid = result.topicData.tid;
                topic.uid = result.topicData.uid;
                done();
            });
        });

        it('should have the guest user as the topic owner', (done) => {
            assert.strictEqual(topic.uid, guestUid);
            done();
        });

        it('should get post count', (done) => {
            socketTopics.postcount({ uid: adminUid }, topic.tid, (err, count) => {
                assert.ifError(err);
                assert.equal(count, 1);
                done();
            });
        });

        it('should load topic under the guest user', async () => {
            const data = await apiTopics.get({ uid: guestUid }, { tid: topic.tid });
            assert.equal(data.tid, topic.tid);
        });

        it('should fail to create new anonymous topic as the guest user themself', (done) => {
            topics.post({
                uid: guestUid,
                title: topic.title,
                content: topic.content,
                cid: topic.categoryId,
                anonymous: true,
            }, (err) => {
                assert.equal(err.message, '[[error:no-privileges]]');
                done();
            });
        });

        it('should fail to create new topic with empty title', (done) => {
            topics.post({
                uid: topic.userId,
                title: '',
                content: topic.content,
                cid: topic.categoryId,
                anonymous: true,
            }, (err) => {
                assert.ok(err);
                done();
            });
        });

        it('should fail to create new anonymous topic with empty content', (done) => {
            topics.post({
                uid: topic.userId,
                title: topic.title,
                content: '',
                cid: topic.categoryId,
                anonymous: true,
            }, (err) => {
                assert.ok(err);
                done();
            });
        });

        it('should fail to create new anonymous topic with non-existant category id', (done) => {
            topics.post({
                uid: topic.userId,
                title: topic.title,
                content: topic.content,
                cid: 99,
                anonymous: true,
            }, (err) => {
                assert.equal(err.message, '[[error:no-category]]', 'received no error');
                done();
            });
        });

        it('should return false for falsy uid', (done) => {
            topics.isOwner(topic.tid, adminUid, (err, isOwner) => {
                assert.ifError(err);
                assert(!isOwner);
                done();
            });
        });

        it('should still post a topic as guest if guest group has privileges', async () => {
            const categoryObj = await categories.create({
                name: 'Test Category',
                description: 'Test category created by testing script',
            });
            await privileges.categories.give(['groups:topics:create'], categoryObj.cid, 'guests');
            await privileges.categories.give(['groups:topics:reply'], categoryObj.cid, 'guests');

            const jar = request.jar();
            const result = await helpers.request('post', `/api/v3/topics`, {
                form: {
                    title: 'just a title',
                    cid: categoryObj.cid,
                    content: 'content for the main post',
                },
                jar: jar,
                json: true,
            });

            assert.strictEqual(result.body.status.code, 'ok');
            assert.strictEqual(result.body.response.title, 'just a title');
            assert.strictEqual(result.body.response.user.username, '[[global:guest]]');

            const replyResult = await helpers.request('post', `/api/v3/topics/${result.body.response.tid}`, {
                form: {
                    content: 'a reply by guest',
                },
                jar: jar,
                json: true,
            });
            assert.strictEqual(replyResult.body.response.content, 'a reply by guest');
            assert.strictEqual(replyResult.body.response.user.username, '[[global:guest]]');
        });

        it('should still post a topic/reply as guest with handle if guest group has privileges', async () => {
            const categoryObj = await categories.create({
                name: 'Test Category',
                description: 'Test category created by testing script',
            });
            await privileges.categories.give(['groups:topics:create'], categoryObj.cid, 'guests');
            await privileges.categories.give(['groups:topics:reply'], categoryObj.cid, 'guests');
            const oldValue = meta.config.allowGuestHandles;
            meta.config.allowGuestHandles = 1;
            const result = await helpers.request('post', `/api/v3/topics`, {
                form: {
                    title: 'just a title',
                    cid: categoryObj.cid,
                    content: 'content for the main post',
                    handle: 'guest123',
                },
                jar: request.jar(),
                json: true,
            });

            assert.strictEqual(result.body.status.code, 'ok');
            assert.strictEqual(result.body.response.title, 'just a title');
            assert.strictEqual(result.body.response.user.username, 'guest123');
            assert.strictEqual(result.body.response.user.displayname, 'guest123');

            const replyResult = await helpers.request('post', `/api/v3/topics/${result.body.response.tid}`, {
                form: {
                    content: 'a reply by guest',
                    handle: 'guest124',
                },
                jar: request.jar(),
                json: true,
            });
            assert.strictEqual(replyResult.body.response.content, 'a reply by guest');
            assert.strictEqual(replyResult.body.response.user.username, 'guest124');
            assert.strictEqual(replyResult.body.response.user.displayname, 'guest124');
            meta.config.allowGuestHandles = oldValue;
        });
    });

    describe('.anonymous-reply', () => {
        let newTopic;
        let newPost;

        before((done) => {
            topics.post({
                uid: topic.userId,
                title: topic.title,
                content: topic.content,
                cid: topic.categoryId,
                anonymous: true,
            }, (err, result) => {
                if (err) {
                    return done(err);
                }

                newTopic = result.topicData;
                newPost = result.postData;
                done();
            });
        });

        it('should create a new anonymous reply with proper parameters', (done) => {
            topics.reply({
                uid: topic.userId,
                content: 'test post',
                tid: newTopic.tid,
                anonymous: true,
            }, (err, result) => {
                assert.equal(err, null, 'was created with error');
                assert.ok(result);

                done();
            });
        });

        it('should handle normal direct replies', (done) => {
            topics.reply({
                uid: topic.userId,
                content: 'test reply',
                tid: newTopic.tid,
                toPid: newPost.pid,
            }, (err, result) => {
                assert.equal(err, null, 'was created with error');
                assert.ok(result);

                socketPosts.getReplies({ uid: 0 }, newPost.pid, (err, postData) => {
                    assert.ifError(err);

                    assert.ok(postData);

                    assert.equal(postData.length, 1, 'should have 1 result');
                    assert.equal(postData[0].pid, result.pid, 'result should be the reply we added');

                    done();
                });
            });
        });

        it('should handle anonymous direct replies', (done) => {
            topics.reply({
                uid: topic.userId,
                content: 'test reply',
                tid: newTopic.tid,
                toPid: newPost.pid,
                anonymous: true,
            }, (err, result) => {
                assert.equal(err, null, 'was created with error');
                assert.ok(result);

                socketPosts.getReplies({ uid: 0 }, newPost.pid, (err, postData) => {
                    assert.ifError(err);

                    assert.ok(postData);

                    assert.equal(postData.length, 2, 'should have 2 results');
                    assert.equal(postData[1].pid, result.pid, 'result should be the reply we added');
                    assert.equal(postData[1].uid, guestUid, 'result should have the guest user as the replier');

                    done();
                });
            });
        });

        it('should fail to create new reply directly with guest user id', (done) => {
            topics.reply({
                uid: 0,
                content: 'test post',
                tid: newTopic.tid,
            }, (err) => {
                assert.equal(err.message, '[[error:no-privileges]]');
                done();
            });
        });

        it('should fail to create new anonymous reply with invalid user id', (done) => {
            topics.reply({
                uid: null,
                content: 'test post',
                tid: newTopic.tid,
                anonymous: true,
            }, (err) => {
                assert.equal(err.message, '[[error:no-privileges]]');
                done();
            });
        });

        it('should fail to create new anonymous reply with empty content', (done) => {
            topics.reply({
                uid: topic.userId,
                content: '',
                tid: newTopic.tid,
                anonymous: true,
            }, (err) => {
                assert.ok(err);
                done();
            });
        });

        it('should fail to create new anonymous reply with invalid topic id', (done) => {
            topics.reply({
                uid: null,
                content: 'test post',
                tid: 99,
                anonymous: true,
            }, (err) => {
                assert.equal(err.message, '[[error:no-topic]]');
                done();
            });
        });

        it('should fail to create new anonymous reply with invalid toPid', (done) => {
            topics.reply({
                uid: topic.userId,
                content: 'test post',
                tid: newTopic.tid,
                toPid: '"onmouseover=alert(1);//',
                anonymous: true,
            }, (err) => {
                assert.equal(err.message, '[[error:invalid-pid]]');
                done();
            });
        });

        it('should still delete nested relies properly', async () => {
            const result = await topics.post({ uid: fooUid, title: 'nested test', content: 'main post', cid: topic.categoryId });
            const reply1 = await topics.reply({ uid: fooUid, content: 'reply post 1', tid: result.topicData.tid });
            const reply2 = await topics.reply({ uid: fooUid, content: 'reply post 2', tid: result.topicData.tid, toPid: reply1.pid });
            let replies = await socketPosts.getReplies({ uid: fooUid }, reply1.pid);
            assert.strictEqual(replies.length, 1);
            assert.strictEqual(replies[0].content, 'reply post 2');
            let toPid = await posts.getPostField(reply2.pid, 'toPid');
            assert.strictEqual(parseInt(toPid, 10), parseInt(reply1.pid, 10));
            await posts.purge(reply1.pid, fooUid);
            replies = await socketPosts.getReplies({ uid: fooUid }, reply1.pid);
            assert.strictEqual(replies.length, 0);
            toPid = await posts.getPostField(reply2.pid, 'toPid');
            assert.strictEqual(toPid, null);
        });

        it('should delete anonymous nested relies properly', async () => {
            const result = await topics.post({
                uid: fooUid,
                title: 'nested test',
                content: 'main post',
                cid: topic.categoryId,
            });
            const reply1 = await topics.reply({
                uid: fooUid,
                content: 'reply post 1',
                tid: result.topicData.tid,
                anonymous: true,
            });
            const reply2 = await topics.reply({
                uid: fooUid,
                content: 'reply post 2',
                tid: result.topicData.tid,
                toPid: reply1.pid,
            });
            let replies = await socketPosts.getReplies({ uid: fooUid }, reply1.pid);
            assert.strictEqual(replies.length, 1);
            assert.strictEqual(replies[0].content, 'reply post 2');
            let toPid = await posts.getPostField(reply2.pid, 'toPid');
            assert.strictEqual(parseInt(toPid, 10), parseInt(reply1.pid, 10));
            await posts.purge(reply1.pid, fooUid);
            replies = await socketPosts.getReplies({ uid: fooUid }, reply1.pid);
            assert.strictEqual(replies.length, 0);
            toPid = await posts.getPostField(reply2.pid, 'toPid');
            assert.strictEqual(toPid, null);
        });
    });
});

describe('Topics\'', async () => {
    let files;

    before(async () => {
        files = await file.walk(path.resolve(__dirname, './topics'));
    });

    it('subfolder tests', () => {
        files.forEach((filePath) => {
            require(filePath);
        });
    });
});


