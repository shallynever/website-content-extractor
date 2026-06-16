export async function closeContextOnError(context, action) {
  try {
    return await action();
  } catch (error) {
    await context.close().catch(() => {});
    throw error;
  }
}
