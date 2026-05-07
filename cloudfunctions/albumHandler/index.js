const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_TYPE_CA });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const { action, data } = event;

  // 1. 获取我的相册
  if (action === 'getMyAlbums') {
    const memberRes = await db.collection('members').where({ _openid: OPENID }).get();
    const albumIds = memberRes.data.map(m => m.albumId);
    const albums = await db.collection('albums').where({ _id: _.in(albumIds) }).get();
    return { code: 0, albums: albums.data };
  }

  // 2. 创建相册
  if (action === 'createAlbum') {
    const res = await db.collection('albums').add({
      data: {
        name: data.name,
        _openid: OPENID,
        createTime: db.serverDate(),
        memberCount: 1,
        coverUrl: ''
      }
    });
    await db.collection('members').add({
      data: { albumId: res._id, _openid: OPENID, joinTime: db.serverDate() }
    });
    return { code: 0, id: res._id };
  }

  // 3. 加入相册
  if (action === 'joinAlbum') {
    const { albumId } = data;
    const album = await db.collection('albums').doc(albumId).get().catch(() => null);
    if (!album) return { code: -1, msg: '相册不存在' };
    const check = await db.collection('members').where({ albumId, _openid: OPENID }).count();
    if (check.total > 0) return { code: 0, msg: '已在相册中' };
    await db.collection('members').add({
      data: { albumId, _openid: OPENID, joinTime: db.serverDate() }
    });
    await db.collection('albums').doc(albumId).update({ data: { memberCount: _.inc(1) } });
    return { code: 0 };
  }

  // 4. 删除相册 (新增/补全)
  if (action === 'deleteAlbum') {
    const { albumId } = data;
    await db.collection('albums').doc(albumId).remove();
    await db.collection('members').where({ albumId }).remove();
    await db.collection('photos').where({ albumId }).remove();
    return { code: 0 };
  }

  // 5. 删除照片 (新增/补全)
  if (action === 'deletePhoto') {
    const { photoId } = data;
    await db.collection('photos').doc(photoId).remove();
    return { code: 0 };
  }
};