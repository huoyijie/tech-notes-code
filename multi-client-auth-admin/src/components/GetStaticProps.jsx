export default async function GetStaticProps({ locale }) {
  const { default: messages } = await import(`../i18n/messages/${locale}.json`)
  return {
    props: { messages }
  }
}