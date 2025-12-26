const pool = require('../config/database');

/**
 * 添加新属性(创建 AttributeKey 和 AttributeValue)
 */
exports.addProductAttribute = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { spu_id } = req.params;
    const { attr_name, values } = req.body;

    console.log('添加新属性:', { spu_id, attr_name, values });

    // 验证权限
    const checkResult = await client.query(
      'SELECT shop_id FROM SPU WHERE spu_id = $1',
      [spu_id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '商品不存在' });
    }

    const productShopId = checkResult.rows[0].shop_id;
    
    const userShopResult = await client.query(
      'SELECT shop_id FROM Shop WHERE account_id = $1',
      [req.user.id]
    );

    if (userShopResult.rows.length === 0 || userShopResult.rows[0].shop_id !== productShopId) {
      return res.status(403).json({ success: false, message: '无权限修改此商品' });
    }

    await client.query('BEGIN');

    // 创建 AttributeKey
    const attrResult = await client.query(
      'INSERT INTO AttributeKey (attr_name, spu_id) VALUES ($1, $2) RETURNING attr_id',
      [attr_name, spu_id]
    );
    const attrId = attrResult.rows[0].attr_id;

    // 创建 AttributeValue
    const createdValues = [];
    for (const value of values) {
      const valueText = typeof value === 'string' ? value : (value.value || value);
      const valueResult = await client.query(
        'INSERT INTO AttributeValue (attr_id, value) VALUES ($1, $2) RETURNING value_id, value',
        [attrId, valueText]
      );
      createdValues.push(valueResult.rows[0]);
    }

    const firstvalue = createdValues.length > 0 ? createdValues[0].value_id : null;
    if (firstvalue) {
        const allskuResult = await client.query(
            'SELECT sku_id FROM SKU WHERE spu_id = $1',
            [spu_id]
        );
        for (const skuRow of allskuResult.rows) {
            await client.query(
                'INSERT INTO SKUAttributeValue (sku_id, value_id) VALUES ($1, $2)',
                [skuRow.sku_id, firstvalue]
            );
        }
    }

    await client.query('COMMIT');

    res.json({ 
      success: true, 
      message: '属性添加成功',
      attr_id: attrId,
      values: createdValues
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('添加属性失败:', error);
    res.status(500).json({ success: false, message: '添加失败: ' + error.message });
  } finally {
    client.release();
  }
};

/**
 * 更新属性名称
 */
exports.updateAttributeName = async (req, res) => {
  try {
    const { spu_id, attr_id } = req.params;
    const { attr_name } = req.body;

    // 验证权限
    const checkResult = await pool.query(
      'SELECT shop_id FROM SPU WHERE spu_id = $1',
      [spu_id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '商品不存在' });
    }

    const productShopId = checkResult.rows[0].shop_id;
    
    const userShopResult = await pool.query(
      'SELECT shop_id FROM Shop WHERE account_id = $1',
      [req.user.id]
    );

    if (userShopResult.rows.length === 0 || userShopResult.rows[0].shop_id !== productShopId) {
      return res.status(403).json({ success: false, message: '无权限修改此商品' });
    }

    // 更新属性名称
    await pool.query(
      'UPDATE AttributeKey SET attr_name = $1 WHERE attr_id = $2 AND spu_id = $3',
      [attr_name, attr_id, spu_id]
    );

    res.json({ success: true, message: '属性名称更新成功' });
  } catch (error) {
    console.error('更新属性名称失败:', error);
    res.status(500).json({ success: false, message: '更新失败: ' + error.message });
  }
};

/**
 * 添加单个属性值
 */
exports.addAttributeValue = async (req, res) => {
  try {
    const { spu_id, attr_id } = req.params;
    const { value } = req.body;

    // 验证权限
    const checkResult = await pool.query(
      'SELECT shop_id FROM SPU WHERE spu_id = $1',
      [spu_id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '商品不存在' });
    }

    const productShopId = checkResult.rows[0].shop_id;
    
    const userShopResult = await pool.query(
      'SELECT shop_id FROM Shop WHERE account_id = $1',
      [req.user.id]
    );

    if (userShopResult.rows.length === 0 || userShopResult.rows[0].shop_id !== productShopId) {
      return res.status(403).json({ success: false, message: '无权限修改此商品' });
    }

    // 添加属性值
    const result = await pool.query(
      'INSERT INTO AttributeValue (attr_id, value) VALUES ($1, $2) RETURNING value_id, value',
      [attr_id, value]
    );

    res.json({ 
      success: true, 
      message: '属性值添加成功',
      value_id: result.rows[0].value_id,
      value: result.rows[0].value
    });
  } catch (error) {
    console.error('添加属性值失败:', error);
    res.status(500).json({ success: false, message: '添加失败: ' + error.message });
  }
};

/**
 * 更新属性值
 */
exports.updateAttributeValue = async (req, res) => {
  try {
    const { spu_id, attr_id, value_id } = req.params;
    const { value } = req.body;

    // 验证权限
    const checkResult = await pool.query(
      'SELECT shop_id FROM SPU WHERE spu_id = $1',
      [spu_id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '商品不存在' });
    }

    const productShopId = checkResult.rows[0].shop_id;
    
    const userShopResult = await pool.query(
      'SELECT shop_id FROM Shop WHERE account_id = $1',
      [req.user.id]
    );

    if (userShopResult.rows.length === 0 || userShopResult.rows[0].shop_id !== productShopId) {
      return res.status(403).json({ success: false, message: '无权限修改此商品' });
    }

    // 更新属性值
    await pool.query(
      'UPDATE AttributeValue SET value = $1 WHERE value_id = $2 AND attr_id = $3',
      [value, value_id, attr_id]
    );

    res.json({ success: true, message: '属性值更新成功' });
  } catch (error) {
    console.error('更新属性值失败:', error);
    res.status(500).json({ success: false, message: '更新失败: ' + error.message });
  }
};

/**
 * 删除属性值
 */
exports.deleteAttributeValue = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { spu_id, attr_id, value_id } = req.params;

    // 验证权限
    const checkResult = await client.query(
      'SELECT shop_id FROM SPU WHERE spu_id = $1',
      [spu_id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '商品不存在' });
    }

    const productShopId = checkResult.rows[0].shop_id;
    
    const userShopResult = await client.query(
      'SELECT shop_id FROM Shop WHERE account_id = $1',
      [req.user.id]
    );

    if (userShopResult.rows.length === 0 || userShopResult.rows[0].shop_id !== productShopId) {
      return res.status(403).json({ success: false, message: '无权限修改此商品' });
    }

    await client.query('BEGIN');

    // 删除属性值
    await client.query(
      'DELETE FROM AttributeValue WHERE value_id = $1 AND attr_id = $2',
      [value_id, attr_id]
    );

    await client.query('COMMIT');

    res.json({ success: true, message: '属性值删除成功' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('删除属性值失败:', error);
    res.status(500).json({ success: false, message: '删除失败: ' + error.message });
  } finally {
    client.release();
  }
};