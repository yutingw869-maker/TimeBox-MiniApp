const db = wx.cloud.database();

Page({
  data: {
    albumId: '', albumInfo: {}, albumName: '', groupedPhotos: []
  },

  onLoad(options) {
    this.setData({ albumId: options.id || options.scene });
    this.fetchData();
  },

  async fetchData() {
    wx.showLoading({ title: '加载中' });
    try {
      const album = await db.collection('albums').doc(this.data.albumId).get();
      const photos = await db.collection('photos').where({ albumId: this.data.albumId }).orderBy('createTime', 'desc').get();
      this.setData({
        albumInfo: album.data,
        albumName: album.data.name,
        groupedPhotos: this.groupPhotosByDate(photos.data)
      });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally { wx.hideLoading(); }
  },

  groupPhotosByDate(photos) {
    const groups = {};
    photos.forEach(p => {
      const d = p.createTime ? new Date(p.createTime).toLocaleDateString() : '最近';
      if (!groups[d]) groups[d] = [];
      groups[d].push(p);
    });
    return Object.keys(groups).map(date => ({ date, list: groups[date] }));
  },

  onCopyID() {
    wx.setClipboardData({
      data: `【时光盒】邀请你加入共享相册：${this.data.albumName}\n邀请码：${this.data.albumId}`,
      success: () => wx.showToast({ title: '已复制邀请码' })
    });
  },

  // 1. 导入照片
  async onUploadPhoto() {
    const res = await wx.chooseImage({ count: 9, sizeType: ['compressed'] });
    wx.showLoading({ title: '上传中' });
    for (let path of res.tempFilePaths) {
      const cloudPath = `photos/${Date.now()}-${Math.random() * 1000000}.jpg`;
      const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: path });
      await db.collection('photos').add({
        data: { albumId: this.data.albumId, fileID: uploadRes.fileID, createTime: db.serverDate() }
      });
    }
    wx.hideLoading();
    this.fetchData();
  },

  // 2. 删除照片
  onDeletePhoto(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '删除照片', content: '确定删除这张照片吗？',
      success: async (res) => {
        if (res.confirm) {
          await wx.cloud.callFunction({
            name: 'albumHandler',
            data: { action: 'deletePhoto', data: { photoId: id } }
          });
          this.fetchData();
        }
      }
    });
  },

  // 3. 更换封面
  async onChooseCover() {
    const res = await wx.chooseImage({ count: 1 });
    wx.showLoading({ title: '更新封面' });
    const cloudPath = `covers/${this.data.albumId}-${Date.now()}.jpg`;
    const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: res.tempFilePaths[0] });
    await db.collection('albums').doc(this.data.albumId).update({
      data: { coverUrl: uploadRes.fileID }
    });
    wx.hideLoading();
    this.fetchData();
  },

  onPreview(e) {
    wx.previewImage({ current: e.currentTarget.dataset.url, urls: [e.currentTarget.dataset.url] });
  },
  
  onExitAlbum() {
    wx.navigateBack(); // 这里可以根据需要改成删除 member 表记录
  }
});