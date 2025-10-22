# google_search_test
谷歌搜索测试


https://www.google.com/search?q=toys
把https://www.google.com/search?q=toys&sei=*重定向到别的网页，让它跳转访问
Chrome浏览器请求后，抓包把响应体保存到本地，只要用node jsdom_env.js生成一下SG_SS，再用那3个cookie去请求，会报429.如果不生成，直接用__Secure-ENID请求就正常！所以应该是生成有破坏污染问题！而且响应头Content-Security-Policy里面的
<script nonce="xxx">。注意 nonce 通常是服务器每次响应动态生成的 —— 所以你必须在替换时动态抓取 CSP 头中的 nonce 并注入到脚本标签里。

而且发现，把uer-agent改为Chrome 120在浏览器中请求得到的3个cookie参数，拿去请求，也会报429



window.SG_SS.length
1044

用脚本生成会破坏其有效性，用浏览器生成就没问题，打开网页：
file:///D:/yuchenye/dingding/google_search_test/谷歌搜索响应-python.html

所以location可能不检测？浏览器改user-agent为
navigator.userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
console.log(navigator.userAgent);
这样生成是可以的，不会像脚本那样破坏污染

但是把user-agent设置为iPhone 12 Pro，对应：
Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1

这样就不行了，会破坏掉，变成429



-----------
拦截响应：
18:22:51.807 request url https://www.google.com/search?q=toys
18:22:51.807 等待3秒后返回响应
18:22:51.807 返回响应


3秒种后再返回响应，好像每次就报429，难道是返回html源码后需要立即执行生成cookie参数？不然生成的值就无效？




