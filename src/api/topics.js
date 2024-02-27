'use strict';

const user = require('../user');
const topics = require('../topics');
const posts = require('../posts');
const meta = require('../meta');
const privileges = require('../privileges');

const apiHelpers = require('./helpers');

const { doTopicAction } = apiHelpers;

const websockets = require('../socket.io');
const socketHelpers = require('../socket.io/helpers');

const topicsAPI = module.exports;

topicsAPI.get = async function (caller, data) {
    const [userPrivileges, topic] = await Promise.all([
        privileges.topics.get(data.tid, caller.uid),
        topics.getTopicData(data.tid),
    ]);
    if (
        !topic ||
        !userPrivileges.read ||
        !userPrivileges['topics:read'] ||
        !privileges.topics.canViewDeletedScheduled(topic, userPrivileges)
    ) {
        return null;
    }

    return topic;
};

topicsAPI.create = async function (caller, data) {
    if (!data) {
        throw new Error('[[error:invalid-data]]');
    }

    const topicUID = caller.uid;

    const payload = { ...data };
    payload.tags = payload.tags || [];
    apiHelpers.setDefaultPostData(caller, payload);
    const isScheduling = parseInt(data.timestamp, 10) > payload.timestamp;

    if (isScheduling) {
        if (await privileges.categories.can('topics:schedule', data.cid, topicUID)) {
            payload.timestamp = parseInt(data.timestamp, 10);
        } else {
            throw new Error('[[error:no-privileges]]');
        }
    }

    await meta.blacklist.test(caller.ip);
    const shouldQueue = await posts.shouldQueue(topicUID, payload);
    if (shouldQueue) {
        return await posts.addToQueue(payload);
    }

    const result = await topics.post(payload);
    await topics.thumbs.migrate(data.uuid, result.topicData.tid);

    socketHelpers.emitToUids('event:new_post', { posts: [result.postData] }, [topicUID]);
    socketHelpers.emitToUids('event:new_topic', result.topicData, [topicUID]);
    socketHelpers.notifyNew(topicUID, 'newTopic', { posts: [result.postData], topic: result.topicData });

    return result.topicData;
};

topicsAPI.reply = async function (caller, data) {
    if (!data || !data.tid || (meta.config.minimumPostLength !== 0 && !data.content)) {
        throw new Error('[[error:invalid-data]]');
    }
    const payload = { ...data };

    apiHelpers.setDefaultPostData(caller, payload);

    let replyUID = caller.uid;
    if (data.anonymous) {
        replyUID = -1;
    }

    await meta.blacklist.test(caller.ip);
    const shouldQueue = await posts.shouldQueue(replyUID, payload);
    if (shouldQueue) {
        return await posts.addToQueue(payload);
    }

    const postData = await topics.reply(payload); // postData seems to be a subset of postObj, refactor?
    const postObj = await posts.getPostSummaryByPids([postData.pid], replyUID, {});

    const result = {
        posts: [postData],
        'reputation:disabled': meta.config['reputation:disabled'] === 1,
        'downvote:disabled': meta.config['downvote:disabled'] === 1,
    };

    user.updateOnlineUsers(caller.uid);
    if (replyUID) {
        console.log('emit to uids', [replyUID]);
        socketHelpers.emitToUids('event:new_post', result, [replyUID]);
    } else if (replyUID === 0) {
        websockets.in('online_guests').emit('event:new_post', result);
    }

    socketHelpers.notifyNew(replyUID, 'newPost', result);

    return postObj[0];
};

topicsAPI.delete = async function (caller, data) {
    await doTopicAction('delete', 'event:topic_deleted', caller, {
        tids: data.tids,
    });
};

topicsAPI.restore = async function (caller, data) {
    await doTopicAction('restore', 'event:topic_restored', caller, {
        tids: data.tids,
    });
};

topicsAPI.purge = async function (caller, data) {
    await doTopicAction('purge', 'event:topic_purged', caller, {
        tids: data.tids,
    });
};

topicsAPI.pin = async function (caller, data) {
    await doTopicAction('pin', 'event:topic_pinned', caller, {
        tids: data.tids,
    });
};

topicsAPI.unpin = async function (caller, data) {
    await doTopicAction('unpin', 'event:topic_unpinned', caller, {
        tids: data.tids,
    });
};

topicsAPI.lock = async function (caller, data) {
    await doTopicAction('lock', 'event:topic_locked', caller, {
        tids: data.tids,
    });
};

topicsAPI.unlock = async function (caller, data) {
    await doTopicAction('unlock', 'event:topic_unlocked', caller, {
        tids: data.tids,
    });
};

topicsAPI.follow = async function (caller, data) {
    await topics.follow(data.tid, caller.uid);
};

topicsAPI.ignore = async function (caller, data) {
    await topics.ignore(data.tid, caller.uid);
};

topicsAPI.unfollow = async function (caller, data) {
    await topics.unfollow(data.tid, caller.uid);
};
