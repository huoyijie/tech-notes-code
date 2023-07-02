import requests, hashlib, http_sfv

from http_message_signatures import HTTPMessageSigner, algorithms
from app_key import MyHTTPSignatureKeyResolver

signer = HTTPMessageSigner(signature_algorithm=algorithms.HMAC_SHA256, key_resolver=MyHTTPSignatureKeyResolver())

request = requests.Request('POST', 'http://localhost:5000/hello/world', json={'HELLO': 'WORLD'})
request = request.prepare()
# 计算 request.body Digest
request.headers['Content-Digest'] = str(http_sfv.Dictionary({'sha-256': hashlib.sha256(request.body).digest()}))

# todo 签名过期时间
signer.sign(request, key_id='my_key_id', covered_component_ids=('@method', '@authority', '@target-uri', 'content-digest'))
print(request.headers)

response = requests.Session().send(request=request)
print(response.content)
