# 정보통신 헬프데스크 MVP

통신 장애 해결방법 안내와 장애 접수/처리 현황 관리를 위한 간단한 정적 웹앱입니다.

## 실행 방법

가장 간단한 방법은 `index.html` 파일을 브라우저로 직접 여는 것입니다.

Python이 설치되어 있다면 PowerShell에서 이 폴더로 이동한 뒤 아래 명령으로도 실행할 수 있습니다.

```powershell
python -m http.server 8000
```

브라우저에서 아래 주소를 엽니다.

```text
http://localhost:8000
```

## Vercel 배포

이 앱은 정적 웹앱이므로 Vercel에서 별도 빌드 명령 없이 배포할 수 있습니다.

- Framework Preset: `Other`
- Build Command: 비워두기
- Output Directory: 비워두기
- Install Command: 비워두기

Vercel이 서버 파일을 함수로 오인하지 않도록 서버 코드 없이 정적 파일만 배포합니다.

## 저장 방식

접수 데이터는 브라우저의 `localStorage`에 저장됩니다. 같은 PC와 같은 브라우저에서는 새로고침 후에도 데이터가 유지됩니다.
