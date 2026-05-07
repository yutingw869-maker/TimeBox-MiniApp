Page({
  data: { albums: [] },
  onShow() { this.fetchAlbums(); },

  async fetchAlbums() {
    wx.showLoading({ title: '加载中', mask: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'albumHandler',
        data: { action: 'getMyAlbums' }
      });
      if (res.result && res.result.code === 0) {
        this.setData({ albums: res.result.albums });
      }
    } catch (e) { console.error(e); } 
    finally { wx.hideLoading(); }
  },

  onCreateAlbum() {
    wx.showModal({
      title: '新建相册', editable: true, placeholderText: '给相册起个名字',
      success: async (res) => {
        if (res.confirm && res.content) {
          wx.showLoading({ title: '创建中' });
          await wx.cloud.callFunction({
            name: 'albumHandler',
            data: { action: 'createAlbum', data: { name: res.content } }
          });
          wx.hideLoading();
          this.fetchAlbums();
        }
      }
    });
  },

  onJoinAlbum() {
    wx.showModal({
      title: '加入相册', editable: true, placeholderText: '粘贴邀请码',
      success: async (res) => {
        if (res.confirm && res.content) {
          const inviteCode = res.content.trim();
          wx.showLoading({ title: '正在加入' });
          const result = await wx.cloud.callFunction({
            name: 'albumHandler',
            data: { action: 'joinAlbum', data: { albumId: inviteCode } }
          });
          wx.hideLoading();
          if (result.result.code === 0) {
            wx.showToast({ title: '加入成功' });
            this.fetchAlbums();
          } else {
            wx.showToast({ title: result.result.msg || '错误', icon: 'none' });
          }
        }
      }
    });
  },

  onDeleteAlbum(e) {
    
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${name}」吗？删除后不可恢复！`,
      confirmColor: '#ff4d4f',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '正在删除' });
          await wx.cloud.callFunction({
            name: 'albumHandler',
            data: { action: 'deleteAlbum', data: { albumId: id } }
          });
          wx.hideLoading();
          this.fetchAlbums();
        }
      }
    });
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/album/detail?id=${e.currentTarget.dataset.id}` });
  }
});