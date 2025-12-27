## `importProductsFromCsv.js`的运行方法
```sh
npm install csv-parse
node backend/scripts/importProductsFromCsv.js test/testdata.csv
```
我是根据本地环境导入的（即店铺名称“雨禾服饰”，仓库code为1）
大胆导入，导入失败会回滚，应该不会污染数据库。
由于图片是从一个开源网站整的方便写url，所以与服饰毫不相关XD。