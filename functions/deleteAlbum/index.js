const cloudbase = require('@cloudbase/node-sdk');

const app = cloudbase.init({
  env: 'startup-2gn33jt0ca955730' // 显式指定环境ID
});

exports.main = async (event, context) => {
  // Normalize body if it comes as string (HTTP trigger)
  let body = event;
  if (event.body) {
      try {
          body = JSON.parse(event.body);
      } catch(e) {
          body = event;
      }
  }
  
  const {
    album_id
  } = body;

  if (!album_id) {
    return {
      code: 400,
      message: 'album_id is required',
      data: null
    };
  }

  try {
    const db = app.database();
    
    // 删除专辑数据
    const result = await db
      .collection('album_list')
      .where({
        album_id: album_id
      })
      .remove();

    if (result.deleted === 0) {
      return {
        code: 404,
        message: 'Album not found',
        data: null
      };
    }

    return {
      code: 200,
      message: 'Success',
      data: {
        deleted: result.deleted
      }
    };
  } catch (e) {
    console.error('deleteAlbum error:', e);
    return {
      code: 500,
      message: e.message || 'Unknown error',
      data: null
    };
  }
};

