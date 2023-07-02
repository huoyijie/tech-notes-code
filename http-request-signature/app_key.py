import math
from http_message_signatures import HTTPSignatureKeyResolver

# 配置密钥生成函数
key_gen = lambda key_id: bytes(str(math.sqrt(2024)), 'utf-8')

class MyHTTPSignatureKeyResolver(HTTPSignatureKeyResolver):
  def resolve_public_key(self, key_id: str):
    return key_gen(key_id=key_id)

  def resolve_private_key(self, key_id: str):
    return key_gen(key_id=key_id)
